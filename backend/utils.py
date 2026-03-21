"""
Utility functions for date handling, stress calculation, and study plan generation.
"""

from datetime import datetime, timedelta
from typing import List, Dict
from collections import defaultdict


# ── Date Utilities ──────────────────────────────────────────────

def parse_date(date_str: str) -> datetime:
    """Parse a YYYY-MM-DD string into a datetime object."""
    return datetime.strptime(date_str, "%Y-%m-%d")


def get_week_number(date: datetime, semester_start: datetime) -> int:
    """
    Calculate the week number relative to the semester start.
    Week 1 begins on the semester_start date.
    """
    delta = (date - semester_start).days
    return max(1, (delta // 7) + 1)


def get_semester_start(events: List[Dict]) -> datetime:
    """
    Infer semester start from the earliest event date,
    rounding back to the previous Monday.
    """
    dates = [parse_date(e["due_date"]) for e in events if e.get("due_date")]
    if not dates:
        return datetime.now()
    earliest = min(dates)
    # Round back to Monday of that week
    return earliest - timedelta(days=earliest.weekday())


# ── Stress Calculation ──────────────────────────────────────────

# Stress points per event type
STRESS_WEIGHTS = {
    "exam": 3,
    "assignment": 1,
}


def compute_stress_scores(events: List[Dict]) -> Dict[str, int]:
    """
    Group events by week and sum stress scores.

    Returns:
        {"week_1": 2, "week_2": 6, ...}

    Scoring:
        exam       → 3 points
        assignment → 1 point
    """
    if not events:
        return {}

    semester_start = get_semester_start(events)
    weekly_stress: Dict[str, int] = defaultdict(int)

    for event in events:
        due = parse_date(event["due_date"])
        week_num = get_week_number(due, semester_start)
        event_type = event.get("type", "assignment")
        stress = STRESS_WEIGHTS.get(event_type, 1)
        weekly_stress[f"week_{week_num}"] += stress

    # Sort by week number for clean output
    return dict(sorted(weekly_stress.items(), key=lambda x: int(x[0].split("_")[1])))


# ── Study Plan Generation ──────────────────────────────────────

def generate_study_plan(
    event: Dict,
    hours_per_day: float = 2.0,
    prep_days: int = 7,
) -> List[Dict]:
    """
    Generate a simple study plan for a given event.

    Strategy:
        - Spread preparation across `prep_days` days before the due date.
        - Each day gets `hours_per_day` hours of study.
        - Task descriptions are auto-generated based on the event title.

    Args:
        event: The target event dict (must have "due_date" and "title").
        hours_per_day: Hours available per day (default 2).
        prep_days: Number of days to prepare (default 7).

    Returns:
        List of {"date": "YYYY-MM-DD", "task": "..."} dicts.
    """
    due = parse_date(event["due_date"])
    title = event.get("title", "Untitled")
    event_type = event.get("type", "assignment")

    plan: List[Dict] = []

    for i in range(prep_days, 0, -1):
        study_date = due - timedelta(days=i)
        day_number = prep_days - i + 1

        # Generate contextual task descriptions
        if event_type == "exam":
            task = _exam_task(day_number, prep_days, title, hours_per_day)
        else:
            task = _assignment_task(day_number, prep_days, title, hours_per_day)

        plan.append({
            "date": study_date.strftime("%Y-%m-%d"),
            "task": task,
        })

    return plan


def _exam_task(day: int, total: int, title: str, hours: float) -> str:
    """Generate a study task description for exam prep."""
    if day <= total * 0.3:
        return f"Review notes & textbook for {title} ({hours}h)"
    elif day <= total * 0.6:
        return f"Practice problems for {title} ({hours}h)"
    elif day <= total * 0.85:
        return f"Work through past papers for {title} ({hours}h)"
    else:
        return f"Final review & weak areas for {title} ({hours}h)"


def _assignment_task(day: int, total: int, title: str, hours: float) -> str:
    """Generate a task description for assignment work."""
    if day <= total * 0.25:
        return f"Research & outline for {title} ({hours}h)"
    elif day <= total * 0.5:
        return f"Draft first sections of {title} ({hours}h)"
    elif day <= total * 0.75:
        return f"Continue writing {title} ({hours}h)"
    else:
        return f"Review, edit & finalize {title} ({hours}h)"
