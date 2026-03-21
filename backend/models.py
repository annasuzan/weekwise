"""
Pydantic models for request/response validation.
Keeps the API contract explicit and self-documenting.
"""

from pydantic import BaseModel
from typing import List, Optional


class SyllabusInput(BaseModel):
    """Raw syllabus text pasted by the user."""
    text: str


class StressRequest(BaseModel):
    """List of parsed events to compute weekly stress for."""
    events: List[dict]


class PlanRequest(BaseModel):
    """Request to generate a study plan for a single event."""
    event: dict                     # The target event (must have due_date)
    hours_per_day: float = 2.0      # Available study hours per day


class SummaryRequest(BaseModel):
    """Request to generate a semester planning summary."""
    events: List[dict]              # All parsed events
    stress: dict                    # Weekly stress scores

class Event(BaseModel):
    """A single academic event extracted from the syllabus."""
    title: str
    type: str                       # "exam" | "assignment"
    due_date: str                   # ISO format YYYY-MM-DD
    weight: Optional[float] = None  # Percentage weight (e.g. 30 means 30%)
    subject: Optional[str] = None   # Course/subject name


class StudyDay(BaseModel):
    """One day in a generated study plan."""
    date: str                       # YYYY-MM-DD
    task: str                       # e.g. "Study chapters 1-2"
