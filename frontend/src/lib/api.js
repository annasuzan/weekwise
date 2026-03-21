/**
 * API client — thin wrappers around fetch for backend calls.
 * All endpoints hit the FastAPI server at localhost:8000.
 */

const API_BASE = "http://localhost:8000";

/**
 * Parse syllabus text into structured events.
 * Backend uses Claude LLM if API key is set, otherwise regex fallback.
 * @param {string} text - Raw syllabus text
 * @returns {Promise<{events: Array}>}
 */
export async function parseSyllabus(text) {
  const res = await fetch(`${API_BASE}/parse-syllabus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to parse syllabus");
  return res.json();
}

/**
 * Upload multiple PDF files for parsing.
 * Backend extracts text from each, combines them, then parses with LLM.
 * @param {File[]} files - Array of PDF file objects
 * @returns {Promise<{events: Array, extracted_text: string, files_processed: string[]}>}
 */
export async function uploadPdf(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(`${API_BASE}/upload-pdf`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload PDFs");
  return res.json();
}

/**
 * Compute weekly stress scores from events.
 * @param {Array} events - List of event objects
 * @returns {Promise<{stress: Object}>}
 */
export async function computeStress(events) {
  const res = await fetch(`${API_BASE}/compute-stress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) throw new Error("Failed to compute stress");
  return res.json();
}

/**
 * Generate a study plan for a single event.
 * @param {Object} event - The target event
 * @param {number} hoursPerDay - Available hours per day (default 2)
 * @returns {Promise<{plan: Array}>}
 */
export async function generatePlan(event, hoursPerDay = 2) {
  const res = await fetch(`${API_BASE}/generate-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, hours_per_day: hoursPerDay }),
  });
  if (!res.ok) throw new Error("Failed to generate plan");
  return res.json();
}

/**
 * Generate an AI-powered semester planning summary.
 * @param {Array} events - All parsed events
 * @param {Object} stress - Weekly stress scores
 * @returns {Promise<{summary: string}>}
 */
export async function generateSummary(events, stress) {
  const res = await fetch(`${API_BASE}/generate-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events, stress }),
  });
  if (!res.ok) throw new Error("Failed to generate summary");
  return res.json();
}

/**
 * Generate a persona-based weekly study plan.
 * @param {Array} events - Academic events for the week
 * @param {string[]} extraActivities - Extra-curricular activities
 * @param {string} persona - "genz" | "gentle" | "drill"
 * @returns {Promise<{plan: string}>}
 */
export async function generateWeeklyPlan(events, extraActivities, persona) {
  const res = await fetch(`${API_BASE}/weekly-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      events,
      extra_activities: extraActivities,
      persona,
    }),
  });
  if (!res.ok) throw new Error("Failed to generate weekly plan");
  return res.json();
}
