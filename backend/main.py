"""
weekwise — FastAPI Backend

Endpoints:
  POST /parse-syllabus   → extract events from syllabus text (LLM or regex)
  POST /upload-pdf       → upload PDF, extract text, parse with LLM
  POST /compute-stress   → compute weekly stress scores
  POST /generate-plan    → create a study plan for one event
"""

from typing import List

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from models import SyllabusInput, StressRequest, PlanRequest, SummaryRequest, WeeklyPlanRequest
from llm_parser import parse_with_llm, generate_semester_summary, generate_weekly_plan
from pdf_parser import extract_text_from_pdf
from utils import compute_stress_scores, generate_study_plan

app = FastAPI(
    title="weekwise",
    description="Hackathon MVP — syllabus parsing, stress heatmap, study plans",
    version="0.3.0",
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

@app.post("/parse-syllabus")
def api_parse_syllabus(payload: SyllabusInput):
    """
    Accept raw syllabus text and return structured events.
    Uses Claude LLM if ANTHROPIC_API_KEY is set, otherwise regex fallback.
    """
    events = parse_with_llm(payload.text)
    return {"events": events}


@app.post("/upload-pdf")
async def api_upload_pdf(files: List[UploadFile] = File(...)):
    """
    Accept one or more PDF file uploads, extract text from each,
    then parse all combined text with Claude (or regex fallback).
    This lets the LLM reason across multiple syllabi at once.
    """
    all_texts = []
    file_names = []

    for f in files:
        pdf_bytes = await f.read()
        text = extract_text_from_pdf(pdf_bytes)
        print(f"[PDF] Extracted {len(text)} chars from {f.filename}")
        if text.strip():
            # Label each syllabus so the LLM knows which course it belongs to
            all_texts.append(f"--- Syllabus: {f.filename} ---\n{text}")
            file_names.append(f.filename)

    if not all_texts:
        return {"error": "Could not extract text from any PDF", "events": [], "files_processed": []}

    combined_text = "\n\n".join(all_texts)
    events = parse_with_llm(combined_text)
    return {
        "events": events,
        "extracted_text": combined_text,
        "files_processed": file_names,
    }


@app.post("/compute-stress")
def api_compute_stress(payload: StressRequest):
    """
    Accept a list of events and return weekly stress scores.
    Scoring: exam = 3 points, assignment = 1 point.
    """
    stress = compute_stress_scores(payload.events)
    return {"stress": stress}


@app.post("/generate-plan")
def api_generate_plan(payload: PlanRequest):
    """
    Generate a daily study plan for a single event.
    Distributes prep across 7 days before the due date.
    """
    plan = generate_study_plan(
        event=payload.event,
        hours_per_day=payload.hours_per_day,
    )
    return {"plan": plan}


@app.post("/generate-summary")
def api_generate_summary(payload: SummaryRequest):
    """
    Generate an AI-powered semester planning summary.
    Uses Claude if available, otherwise a rule-based fallback.
    """
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
