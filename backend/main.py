"""
weekwise — FastAPI Backend

Endpoints:
  POST /parse-syllabus   → extract events from syllabus text (LLM or regex).
  POST /upload-pdf       → upload PDF, extract text, parse with LLM
  POST /compute-stress   → compute weekly stress scores
  POST /generate-plan    → create a study plan for one event
  GET  /auth/google      → initiate Google OAuth login
  GET  /auth/google/callback → handle Google OAuth callback
  POST /auth/logout      → clear session cookie
  GET  /api/me           → return current logged-in user
"""

import os
from typing import List
from typing import Optional
import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
from jose import JWTError, jwt
from datetime import datetime, timedelta

from models import SyllabusInput, StressRequest, PlanRequest, SummaryRequest, WeeklyPlanRequest
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from llm_parser import parse_with_llm, generate_semester_summary, generate_weekly_plan
from pdf_parser import extract_text_from_pdf
from utils import compute_stress_scores, generate_study_plan

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
JWT_SECRET           = os.getenv("JWT_SECRET", "change-me-in-production")
ALGORITHM            = "HS256"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")
BACKEND_URL  = os.getenv("BACKEND_URL",  "http://localhost:8000")

app = FastAPI(
    title="weekwise",
    description="Hackathon MVP — syllabus parsing, stress heatmap, study plans",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:8080", "http://127.0.0.1:8080",
        "https://weekwise-tan.vercel.app/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# # In CORS:
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:8080")],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# ── Auth helpers ──────────────────────────────────────────────────────────────
def create_jwt(user_data: dict) -> str:
    payload = {**user_data, "exp": datetime.utcnow() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


async def require_auth(request: Request) -> dict:
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def optional_auth(request: Request) -> Optional[dict]:
    """Dependency that returns user data if cookie present, else None."""
    token = request.cookies.get("token")
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_google_auth_url() -> str:
    scopes = " ".join([
        "openid", "email", "profile",
        "https://www.googleapis.com/auth/calendar",
    ])
    return (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={BACKEND_URL}/auth/google/callback"
        "&response_type=code"
        f"&scope={scopes}"
        "&access_type=offline"
        "&prompt=consent"
    )


async def exchange_code_for_tokens(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post("https://oauth2.googleapis.com/token", data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  f"{BACKEND_URL}/auth/google/callback",
            "grant_type":    "authorization_code",
        })
        return r.json()


async def get_google_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        return r.json()


# ── Auth routes (public) ──────────────────────────────────────────────────────
@app.get("/auth/google")
def google_login():
    return RedirectResponse(get_google_auth_url())


@app.get("/auth/google/callback")
async def google_callback(code: str):
    tokens    = await exchange_code_for_tokens(code)
    user_info = await get_google_user_info(tokens["access_token"])

    jwt_token = create_jwt({
        "userId":       user_info["sub"],
        "email":        user_info["email"],
        "name":         user_info.get("name", ""),
        "picture":      user_info.get("picture", ""),
        "accessToken":  tokens.get("access_token"),
        "refreshToken": tokens.get("refresh_token"),
    })

    is_production = os.getenv("NODE_ENV") == "production"

    response = RedirectResponse(url=f"{FRONTEND_URL}/", status_code=302)
    response.set_cookie(
        key="token",
        value=jwt_token,
        httponly=True,
        samesite="none" if is_production else "lax",  
        secure=is_production,                          
        max_age=7 * 24 * 60 * 60,
    )
    return response


@app.post("/auth/logout")
def logout(response: Response):
    is_production = os.getenv("NODE_ENV") == "production"
    response.delete_cookie(
        key="token",
        httponly=True,
        samesite="none" if is_production else "lax", 
        secure=is_production,
    )
    return {"success": True}

@app.get("/api/me")
async def get_me(user=Depends(require_auth)):
    return user


# ── Existing routes (now protected) ──────────────────────────────────────────
@app.post("/parse-syllabus")
def api_parse_syllabus(payload: SyllabusInput, user=Depends(optional_auth)):
    events = parse_with_llm(payload.text)
    return {"events": events}


@app.post("/upload-pdf")
async def api_upload_pdf(
    files: List[UploadFile] = File(...),
    user=Depends(optional_auth),
):
    all_texts  = []
    file_names = []

    for f in files:
        pdf_bytes = await f.read()
        text = extract_text_from_pdf(pdf_bytes)
        print(f"[PDF] Extracted {len(text)} chars from {f.filename}")
        if text.strip():
            all_texts.append(f"--- Syllabus: {f.filename} ---\n{text}")
            file_names.append(f.filename)

    if not all_texts:
        return {"error": "Could not extract text from any PDF", "events": [], "files_processed": []}

    combined_text = "\n\n".join(all_texts)
    events = parse_with_llm(combined_text)
    return {
        "events":         events,
        "extracted_text": combined_text,
        "files_processed": file_names,
    }


@app.post("/compute-stress")
def api_compute_stress(payload: StressRequest, user=Depends(optional_auth)):
    stress = compute_stress_scores(payload.events)
    return {"stress": stress}


@app.post("/generate-plan")
def api_generate_plan(payload: PlanRequest, user=Depends(optional_auth)):
    plan = generate_study_plan(
        event=payload.event,
        hours_per_day=payload.hours_per_day,
    )
    return {"plan": plan}


@app.post("/generate-summary")
def api_generate_summary(payload: SummaryRequest, user=Depends(optional_auth)):
    summary = generate_semester_summary(payload.events, payload.stress)
    return {"summary": summary}


@app.post("/weekly-plan")
def api_weekly_plan(payload: WeeklyPlanRequest):
    """
    Generate a persona-based weekly study plan.
    Personas: genz, gentle, drill.
    """
    plan = generate_weekly_plan(payload.events, payload.extra_activities, payload.persona)
    return {"plan": plan}


@app.get("/")
def health():
    return {"status": "ok", "app": "weekwise"}

@app.post("/sync-calendar")
async def sync_calendar(request: Request, user=Depends(require_auth)):
    body         = await request.json()
    events       = body.get("events", [])
    access_token = user.get("accessToken")
    refresh_token = user.get("refreshToken")

    if not access_token:
        raise HTTPException(status_code=401, detail="No Google access token — please log in again")

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )
    service = build("calendar", "v3", credentials=creds)

    results = []
    synced  = 0
    failed  = 0

    for event in events:
        try:
            due_date = event.get("due_date") or event.get("dueDate") or ""
            if not due_date:
                failed += 1
                results.append({"event": event.get("title"), "status": "failed", "reason": "No due_date"})
                continue

            # Build a descriptive title e.g. "Midterm Exam — Linear Algebra (30%)"
            weight  = event.get("weight")
            subject = event.get("subject", "")
            weight_str = f" ({int(weight)}%)" if weight else ""
            summary = f"{event.get('title', 'Untitled')} — {subject}{weight_str}".strip(" —")

            cal_event = {
                "summary": summary,
                "description": (
                    f"Type: {event.get('type', 'assignment').capitalize()}\n"
                    f"Subject: {subject}\n"
                    f"Weight: {f'{int(weight)}%' if weight else 'N/A'}\n"
                    f"Added by WeekWise"
                ),
                "start": { "date": due_date[:10], "timeZone": "America/New_York" },
                "end":   { "date": due_date[:10], "timeZone": "America/New_York" },
                "colorId": "11" if event.get("type") == "exam" else "9",  # red for exams, blue for assignments
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 60 * 24 * 3},   # 3 days before
                        {"method": "popup", "minutes": 60 * 24},        # 1 day before
                    ],
                },
            }

            created = service.events().insert(calendarId="primary", body=cal_event).execute()
            synced += 1
            results.append({
                "event":  event.get("title"),
                "status": "synced",
                "link":   created.get("htmlLink"),
            })

        except Exception as e:
            failed += 1
            results.append({"event": event.get("title"), "status": "failed", "reason": str(e)})

    return {"synced": synced, "failed": failed, "results": results}