"""
weekwise — FastAPI Backend

Endpoints:
  POST /parse-syllabus   → extract events from syllabus text (LLM or regex)
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

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
from jose import JWTError, jwt
from datetime import datetime, timedelta

from models import SyllabusInput, StressRequest, PlanRequest, SummaryRequest, WeeklyPlanRequest
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

    response = RedirectResponse(
        url=f"{FRONTEND_URL}/",
        status_code=302,
    )
    response.set_cookie(        # ← inside the function, not at module level
        key="token",
        value=jwt_token,
        httponly=True,
        samesite="lax",
        secure=os.getenv("NODE_ENV") == "production",
        max_age=7 * 24 * 60 * 60,
    )
    return response


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(
        key="token",
        httponly=True,
        samesite="lax",
        secure=os.getenv("NODE_ENV") == "production",  # ← matches set_cookie
    )
    return {"success": True}

@app.get("/api/me")
async def get_me(user=Depends(require_auth)):
    return user


# ── Existing routes (now protected) ──────────────────────────────────────────
@app.post("/parse-syllabus")
def api_parse_syllabus(payload: SyllabusInput, user=Depends(require_auth)):
    events = parse_with_llm(payload.text)
    return {"events": events}


@app.post("/upload-pdf")
async def api_upload_pdf(
    files: List[UploadFile] = File(...),
    user=Depends(require_auth),         # ← added
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
def api_compute_stress(payload: StressRequest, user=Depends(require_auth)):
    stress = compute_stress_scores(payload.events)
    return {"stress": stress}


@app.post("/generate-plan")
def api_generate_plan(payload: PlanRequest, user=Depends(require_auth)):
    plan = generate_study_plan(
        event=payload.event,
        hours_per_day=payload.hours_per_day,
    )
    return {"plan": plan}


@app.post("/generate-summary")
def api_generate_summary(payload: SummaryRequest, user=Depends(require_auth)):
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