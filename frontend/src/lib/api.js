/**
 * API client — thin wrappers around fetch for backend calls.
 * All endpoints hit the FastAPI server at localhost:8000.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
// const API_BASE = "http://localhost:8000";

const defaultOptions = {
  credentials: "include",   // ← sends cookie with every request
};

export async function parseSyllabus(text) {
  const res = await fetch(`${API_BASE}/parse-syllabus`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to parse syllabus");
  return res.json();
}

export async function uploadPdf(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(`${API_BASE}/upload-pdf`, {
    ...defaultOptions,
    method: "POST",
    body: formData,           // no Content-Type header — browser sets it automatically for FormData
  });
  if (!res.ok) throw new Error("Failed to upload PDFs");

  return res.json();

}

export async function computeStress(events) {
  const res = await fetch(`${API_BASE}/compute-stress`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) throw new Error("Failed to compute stress");
  return res.json();
}

export async function generatePlan(event, hoursPerDay = 2) {
  const res = await fetch(`${API_BASE}/generate-plan`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, hours_per_day: hoursPerDay }),
  });
  if (!res.ok) throw new Error("Failed to generate plan");
  return res.json();
}

export async function generateSummary(events, stress) {
  const res = await fetch(`${API_BASE}/generate-summary`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events, stress }),
  });
  if (!res.ok) throw new Error("Failed to generate summary");
  return res.json();
}

export async function generateWeeklyPlan(events, extraActivities, persona) {
  const res = await fetch(`${API_BASE}/weekly-plan`, {
    ...defaultOptions,
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


/**
 * Sync events to Google Calendar.
 * @param {Array} events - List of event objects from uploadPdf/parseSyllabus
 * @returns {Promise<{synced: number, failed: number, results: Array}>}
 */
export async function syncToCalendar(events) {
  const res = await fetch(`${API_BASE}/sync-calendar`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to sync to calendar");
  }
  return res.json();
}