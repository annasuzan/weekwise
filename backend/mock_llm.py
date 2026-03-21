"""
Mock LLM module — extracts academic events from syllabus text.

Uses regex heuristics to detect dates, event types, and weights.
Falls back to hardcoded sample data when nothing is detected.
Replace this with a real LLM call (e.g. OpenAI) for production use.
"""

import re
from typing import List, Dict, Optional


# ── Hardcoded fallback data ─────────────────────────────────────

SAMPLE_EVENTS: List[Dict] = [
    {
        "title": "Midterm Exam",
        "type": "exam",
        "due_date": "2026-04-15",
        "weight": 30,
        "subject": "CS 101",
    },
    {
        "title": "Final Exam",
        "type": "exam",
        "due_date": "2026-06-10",
        "weight": 40,
        "subject": "CS 101",
    },
    {
        "title": "Research Paper",
        "type": "assignment",
        "due_date": "2026-05-01",
        "weight": 15,
        "subject": "English 201",
    },
    {
        "title": "Problem Set 1",
        "type": "assignment",
        "due_date": "2026-04-01",
        "weight": 5,
        "subject": "Math 301",
    },
    {
        "title": "Problem Set 2",
        "type": "assignment",
        "due_date": "2026-04-20",
        "weight": 5,
        "subject": "Math 301",
    },
    {
        "title": "Group Project",
        "type": "assignment",
        "due_date": "2026-05-20",
        "weight": 5,
        "subject": "CS 101",
    },
]


# ── Regex patterns ──────────────────────────────────────────────

# Matches dates like 2026-04-15, April 15 2026, 04/15/2026
DATE_PATTERNS = [
    r"\d{4}-\d{2}-\d{2}",                          # ISO: 2026-04-15
    r"\d{1,2}/\d{1,2}/\d{4}",                       # US: 04/15/2026
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}",  # April 15, 2026
]

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12",
}


def _normalize_date(raw: str) -> Optional[str]:
    """Convert various date formats to YYYY-MM-DD."""
    raw = raw.strip()

    # Already ISO
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw

    # US format: MM/DD/YYYY
    us_match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw)
    if us_match:
        m, d, y = us_match.groups()
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"

    # Month name: April 15, 2026
    name_match = re.match(
        r"^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$", raw
    )
    if name_match:
        month_str, day, year = name_match.groups()
        month_num = MONTH_MAP.get(month_str[:3].lower(), "01")
        return f"{year}-{month_num}-{day.zfill(2)}"

    return raw  # return as-is if unrecognised


def _detect_type(line: str) -> Optional[str]:
    """Guess event type from keyword presence."""
    lower = line.lower()
    if any(kw in lower for kw in ["exam", "midterm", "final", "quiz", "test"]):
        return "exam"
    return "assignment"



def _extract_weight(line: str) -> Optional[float]:
    """Pull percentage weight like '30%' or 'worth 30'."""
    match = re.search(r"(\d{1,3})\s*%", line)
    if match:
        return float(match.group(1))
    match = re.search(r"worth\s+(\d{1,3})", line, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return None


def _extract_title(line: str, date_str: str) -> Optional[str]:
    """
    Build a title from the line by removing the date and weight,
    then cleaning up leftover punctuation.
    """
    title = line
    # Remove date from line
    title = title.replace(date_str, "").strip()
    # Remove weight portion like "30%" or "worth 30"
    title = re.sub(r"\d{1,3}\s*%", "", title)
    title = re.sub(r"worth\s+\d{1,3}", "", title, flags=re.IGNORECASE)
    # Remove common delimiters and dangling punctuation
    title = re.sub(r"[-–—:|,]+$", "", title).strip()
    title = re.sub(r"^[-–—:|,]+", "", title).strip()

    return title if title else "Untitled Event"


# ── Main parser ─────────────────────────────────────────────────

def parse_syllabus(text: str) -> List[Dict]:
    """
    Parse syllabus text and extract academic events.

    Strategy:
      1. Split text into lines.
      2. For each line, try to find a date.
      3. If found, extract type, weight, and title.
      4. If no events found at all, return sample data.
    """
    events: List[Dict] = []
    combined_pattern = "|".join(DATE_PATTERNS)

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Try to find a date in this line
        date_match = re.search(combined_pattern, line, re.IGNORECASE)
        if not date_match:
            continue

        raw_date = date_match.group(0)
        due_date = _normalize_date(raw_date)
        event_type = _detect_type(line)
        weight = _extract_weight(line)
        title = _extract_title(line, raw_date)

        events.append({
            "title": title,
            "type": event_type,
            "due_date": due_date,
            "weight": weight,
        })

    # Fallback: if parsing found nothing, return mock data
    if not events:
        return SAMPLE_EVENTS

    return events
