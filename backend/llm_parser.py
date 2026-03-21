"""
LLM integration module — uses Claude (Anthropic) to intelligently parse
syllabus text into structured academic events.

Falls back to the regex-based mock parser if no API key is configured.
Set ANTHROPIC_API_KEY environment variable to enable Claude.
"""

import os
import json
from typing import List, Dict, Optional
from mock_llm import parse_syllabus as regex_parse_syllabus

# Only import anthropic if available
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


SYSTEM_PROMPT = """You are an academic syllabus parser. Your job is to extract ALL graded events 
(exams, assignments, quizzes, projects, papers, presentations, labs, etc.) from syllabus text.

You MUST respond with ONLY a valid JSON array. No markdown, no explanation, no code fences.

Each event must have exactly these fields:
- "title": string — descriptive name of the event
- "type": string — one of "exam" or "assignment" (use "exam" for midterms, finals, quizzes, tests; use "assignment" for everything else)
- "due_date": string — date in YYYY-MM-DD format (if only month is given, use the 15th; if no year, assume 2026)
- "weight": number or null — percentage weight of the grade (e.g., 30 means 30%)
- "subject": string — the course or subject name (e.g., "CS 101", "Linear Algebra"). Infer from content of the PDF and course plan. Priority to the subject not being a code but rather a name.

Example output:
[
  {"title": "Midterm Exam", "type": "exam", "due_date": "2026-04-15", "weight": 30, "subject": "CS 101"},
  {"title": "Research Paper", "type": "assignment", "due_date": "2026-05-01", "weight": 15, "subject": "English 201"}
]

Important rules:
1. Extract EVERY graded item you can find, even if weight is unknown (set weight to null).
2. Be precise with dates — parse them carefully from the text.
3. If the syllabus has a grading breakdown table, use it to assign weights.
4. If a date range is given (e.g., "Week 5"), estimate the date based on context. If you cannot estimate ensure that you cap the date to May 5th. 
5. Always include the subject/course name. If multiple syllabi are provided, distinguish events by their source course.
6. If there is a mention of "Problem Sets" divide into 3 or 4 assignments and distribute the weight equally among them. 
7. If there is a mention of "Programming Lab" divide it into 5 equal parts. 
8. Respond with ONLY the JSON array — no other text."""


SUMMARY_PROMPT = """You are a Gen-Z academic advisor AI. Given a student's semester events and weekly stress scores,
provide a concise, actionable semester planning summary but add a twist to it and have a fun and engaging tone.

Your summary should:
1. Identify the most stressful weeks and what makes them hard.
2. Suggest which weeks the student should start preparing early.
3. Flag potential conflicts (e.g., multiple exams in the same week across subjects).
4. Give 2-3 concrete tips for managing the workload.
5. Keep it encouraging and practical — this is a student who wants to do well.

Keep the summary to 2-3 short paragraphs. Use plain text, no markdown formatting."""


def get_anthropic_client() -> Optional[object]:
    """Get an Anthropic client if API key is configured."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key or not HAS_ANTHROPIC:
        return None
    return anthropic.Anthropic(api_key=api_key)


def parse_with_llm(text: str) -> List[Dict]:
    """
    Parse syllabus text using Claude to extract structured events.

    Strategy:
      1. Try Claude API if ANTHROPIC_API_KEY is set.
      2. Fall back to regex parser if no API key or on error.

    Args:
        text: Raw syllabus text (from paste or PDF extraction).

    Returns:
        List of event dicts with title, type, due_date, weight.
    """
    client = get_anthropic_client()

    if client is None:
        # No API key — fall back to regex parser
        print("[LLM] No ANTHROPIC_API_KEY set, using regex fallback")
        return regex_parse_syllabus(text)

    try:
        print("[LLM] Sending syllabus to Claude for parsing...")
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Parse this syllabus and extract all academic events:\n\n{text}"
                }
            ]
        )

        # Extract the text response
        response_text = message.content[0].text.strip()

        # Parse JSON from response (handle potential markdown fences)
        if response_text.startswith("```"):
            # Strip markdown code fences if present
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        events = json.loads(response_text)

        # Validate structure
        validated = []
        for event in events:
            validated.append({
                "title": event.get("title", "Untitled Event"),
                "type": event.get("type", "assignment"),
                "due_date": event.get("due_date", "2026-01-01"),
                "weight": event.get("weight"),
                "subject": event.get("subject", "General"),
            })

        if validated:
            print(f"[LLM] Successfully extracted {len(validated)} events via Claude")
            print(validated)
            return validated

        # Empty result — fall back
        print("[LLM] Claude returned empty results, using regex fallback")
        return regex_parse_syllabus(text)

    except json.JSONDecodeError as e:
        print(f"[LLM] Failed to parse Claude response as JSON: {e}")
        return regex_parse_syllabus(text)
    except Exception as e:
        print(f"[LLM] Claude API error: {e}")
        return regex_parse_syllabus(text)


def generate_semester_summary(events: List[Dict], stress: Dict[str, int]) -> str:
    """
    Generate an AI-powered semester planning summary based on
    the student's events and weekly stress distribution.

    Falls back to a simple rule-based summary if no API key.
    """
    client = get_anthropic_client()

    # Build context string for the LLM
    events_text = json.dumps(events, indent=2)
    stress_text = json.dumps(stress, indent=2)

    user_msg = (
        f"Here are the student's semester events:\n{events_text}\n\n"
        f"Here are the weekly stress scores (exam=3pts, assignment=1pt):\n{stress_text}\n\n"
        f"Please provide a semester planning summary."
    )

    if client is None:
        # No API key — generate a simple rule-based summary
        return _fallback_summary(events, stress)

    try:
        print("[LLM] Generating semester summary via Claude...")
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SUMMARY_PROMPT,
            messages=[{"role": "user", "content": user_msg}]
        )
        summary = message.content[0].text.strip()
        print(f"[LLM] Semester summary generated ({len(summary)} chars)")
        return summary
    except Exception as e:
        print(f"[LLM] Summary generation error: {e}")
        return _fallback_summary(events, stress)


def _fallback_summary(events: List[Dict], stress: Dict[str, int]) -> str:
    """Rule-based summary when no LLM is available."""
    if not stress:
        return "Upload your syllabi to see a personalized semester summary."

    sorted_weeks = sorted(stress.items(), key=lambda x: x[1], reverse=True)
    peak_week, peak_score = sorted_weeks[0]
    peak_label = peak_week.replace("_", " ").title()

    # Find subjects
    subjects = list(set(e.get("subject", "General") for e in events))
    exam_count = sum(1 for e in events if e.get("type") == "exam")
    assignment_count = len(events) - exam_count

    # Find conflict weeks (multiple exams)
    from collections import Counter
    exam_weeks = []
    for e in events:
        if e.get("type") == "exam":
            exam_weeks.append(e.get("due_date", "")[:7])  # group by month
    conflicts = [m for m, c in Counter(exam_weeks).items() if c > 1]

    lines = []
    lines.append(
        f"You have {len(events)} graded items this semester across "
        f"{len(subjects)} subject{'s' if len(subjects) != 1 else ''}: "
        f"{', '.join(subjects)}. This includes {exam_count} exam{'s' if exam_count != 1 else ''} "
        f"and {assignment_count} assignment{'s' if assignment_count != 1 else ''}."
    )
    lines.append(
        f"Your most intense period is {peak_label} with a stress score of {peak_score}. "
        f"Plan to start preparing at least one week before this peak."
    )
    if conflicts:
        lines.append(
            f"Watch out for potential conflicts — you have multiple exams scheduled close together. "
            f"Consider staggering your study sessions across these periods."
        )
    lines.append(
        f"Tip: Use the study plan generator for each event to break down preparation "
        f"into manageable daily tasks. Start with the highest-weight items first."
    )
    return "\n\n".join(lines)


# ── Weekly Plan Persona Prompts ─────────────────────────────

WEEKLY_PLAN_PERSONAS = {
    "genz": """You are a Gen-Z study buddy. Create a concise weekly study plan.
Use casual language and slang naturally (slay, no cap, lowkey, bestie).

STRUCTURE (strict):
1. First: Write exactly 4 short sentences in your persona voice motivating the student and acknowledging their week. Reference specific tasks and extra-curricular activities they mentioned. End with something like "here's your game plan."
2. Then a blank line.
3. Then one line per day (Monday through Sunday):
   "Monday: [task] (~Xh) | [task] (~Xh)"
   - Include estimated hours for each task
   - Max 2 tasks per day, each under 10 words
   - If the student has an extra-curricular activity on a day, INCLUDE it and reduce study time
   - No markdown, no bullet points, just plain lines""",

    "gentle": """You are a kind, encouraging study coach. Create a concise weekly study plan.
Use warm, supportive language with gentle reminders.

STRUCTURE (strict):
1. First: Write exactly 4 short sentences in your persona voice warmly encouraging the student. Acknowledge their workload and any extra-curricular activities they mentioned. End with something reassuring.
2. Then a blank line.
3. Then one line per day (Monday through Sunday):
   "Monday: [task] (~Xh) | [task] (~Xh)"
   - Include estimated hours for each task
   - Max 2 tasks per day, each under 10 words
   - If the student has an extra-curricular activity on a day, INCLUDE it and reduce study time
   - No markdown, no bullet points, just plain lines""",

    "drill": """You are a DRILL SERGEANT study coach. Create a concise weekly study plan.
USE CAPS FOR EMPHASIS. Be intense but supportive. Tough love.

STRUCTURE (strict):
1. First: Write exactly 4 short sentences in your DRILL SERGEANT voice pumping up the student. Acknowledge their missions (tasks) and any extra-curricular ops. Use military metaphors. End with something like "HERE'S THE BATTLE PLAN."
2. Then a blank line.
3. Then one line per day (Monday through Sunday):
   "Monday: [task] (~Xh) | [task] (~Xh)"
   - Include estimated hours for each task
   - Max 2 tasks per day, each under 10 words
   - If the student has an extra-curricular activity on a day, INCLUDE it and reduce study time
   - No markdown, no bullet points, just plain lines""",
}


def generate_weekly_plan(events: List[Dict], extra_activities: List[str], persona: str) -> str:
    """
    Generate a personalized weekly study plan using Claude,
    tailored to the selected persona tone.
    Falls back to a simple rule-based plan if no API key.
    """
    client = get_anthropic_client()

    system_prompt = WEEKLY_PLAN_PERSONAS.get(persona, WEEKLY_PLAN_PERSONAS["genz"])

    events_text = json.dumps(events, indent=2)
    extras_text = "\n".join(f"- {a}" for a in extra_activities) if extra_activities else "None"

    user_msg = (
        f"Here are the student's academic events for this week:\n{events_text}\n\n"
        f"Extra-curricular activities this week:\n{extras_text}\n\n"
        f"Create a day-by-day study plan for this week (Mon-Sun) that accounts for "
        f"both academic deadlines and extra-curricular commitments. "
        f"Prioritize exams and high-weight assignments."
    )

    if client is None:
        return _fallback_weekly_plan(events, extra_activities)

    try:
        print(f"[LLM] Generating weekly plan (persona: {persona})...")
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_msg}]
        )
        plan = message.content[0].text.strip()
        print(f"[LLM] Weekly plan generated ({len(plan)} chars)")
        return plan
    except Exception as e:
        print(f"[LLM] Weekly plan error: {e}")
        return _fallback_weekly_plan(events, extra_activities)


def _fallback_weekly_plan(events: List[Dict], extra_activities: List[str]) -> str:
    """Simple rule-based weekly plan when no LLM is available."""
    if not events:
        return "No events this week! Use the free time to review past material or get ahead."

    lines = ["Here's your week at a glance:\n"]
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    exams = [e for e in events if e.get("type") == "exam"]
    assignments = [e for e in events if e.get("type") != "exam"]

    for i, day in enumerate(days):
        tasks = []
        if exams and i < 4:
            tasks.append(f"Study for {exams[0].get('title', 'exam')} ({exams[0].get('subject', '')})")
        if assignments and i % 2 == 0:
            a = assignments[i // 2 % len(assignments)]
            tasks.append(f"Work on {a.get('title', 'assignment')}")
        if extra_activities and i >= 5:
            tasks.append(f"Attend: {extra_activities[0]}")

        if tasks:
            lines.append(f"{day}: {'; '.join(tasks)}")
        else:
            lines.append(f"{day}: Light review or rest day")

    return "\n".join(lines)

