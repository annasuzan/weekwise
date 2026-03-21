"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { computeStress, generatePlan, generateSummary } from "@/lib/api";

// ── Subject color palette ────────────────────────────────
// Deterministic color assignment — warm earthy tones for light rustic theme
const SUBJECT_COLORS = [
  { bg: "rgba(184, 92, 60, 0.10)",   text: "#a04e32" },  // terracotta
  { bg: "rgba(122, 139, 111, 0.12)", text: "#5e7350" },  // olive
  { bg: "rgba(168, 120, 72, 0.12)",  text: "#8b6242" },  // sienna
  { bg: "rgba(96, 125, 139, 0.12)",  text: "#546e7a" },  // slate
  { bg: "rgba(196, 154, 60, 0.12)",  text: "#9a7a2e" },  // goldenrod
  { bg: "rgba(120, 100, 140, 0.12)", text: "#6b5b7b" },  // dusty purple
  { bg: "rgba(140, 100, 80, 0.12)",  text: "#7a5a3e" },  // walnut
  { bg: "rgba(100, 130, 100, 0.12)", text: "#4a6a4a" },  // forest
];

function getSubjectColor(subject) {
  if (!subject) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

/**
 * /dashboard — events table with subject tags, stress heatmap,
 * semester summary, and study plan generator.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [stress, setStress] = useState({});
  const [summary, setSummary] = useState("");
  const [plan, setPlan] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingStress, setLoadingStress] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState(null);

  // ── Load events from localStorage on mount ──────────────
  useEffect(() => {
    const stored = localStorage.getItem("autopilot_events");
    if (!stored) {
      router.push("/upload");
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setEvents(parsed);

      // Load cached summary if available
      const cachedSummary = localStorage.getItem("autopilot_summary");
      if (cachedSummary) setSummary(cachedSummary);

      fetchStress(parsed, !!cachedSummary);
    } catch {
      router.push("/upload");
    }
  }, []);

  // ── Fetch stress scores, then generate summary if not cached
  const fetchStress = async (evts, hasCachedSummary = false) => {
    setLoadingStress(true);
    try {
      const data = await computeStress(evts);
      setStress(data.stress);
      // Only generate summary if not already cached
      if (!hasCachedSummary) fetchSummary(evts, data.stress);
    } catch (err) {
      setError("Failed to compute stress. Is the backend running?");
    } finally {
      setLoadingStress(false);
    }
  };

  // ── Fetch semester summary and cache it ─────────────────
  const fetchSummary = async (evts, stressData) => {
    setLoadingSummary(true);
    try {
      const data = await generateSummary(evts, stressData);
      setSummary(data.summary);
      localStorage.setItem("autopilot_summary", data.summary);
    } catch (err) {
      console.error("Summary generation failed:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // ── Generate study plan for selected event ──────────────
  const handleGeneratePlan = async (event) => {
    setSelectedEvent(event);
    setLoadingPlan(true);
    setPlan([]);
    try {
      const data = await generatePlan(event);
      setPlan(data.plan);
    } catch (err) {
      setError("Failed to generate plan.");
    } finally {
      setLoadingPlan(false);
    }
  };

  // ── Stress level color helper ───────────────────────────
  const getStressColor = (score) => {
    if (score <= 1) return { bg: "bg-[#7a8b6f]/15", text: "text-[#5e7350]", label: "Low" };
    if (score <= 3) return { bg: "bg-[#c49a3c]/15", text: "text-[#9a7a2e]", label: "Medium" };
    return { bg: "bg-[#b85c3c]/15", text: "text-[#a04e32]", label: "High" };
  };

  const maxStress = Math.max(...Object.values(stress), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Dashboard</h1>
          <p className="text-[--color-text-muted] text-sm">
            {events.length} event{events.length !== 1 ? "s" : ""} extracted from your syllabus
          </p>
        </div>
        <button
          onClick={() => router.push("/upload")}
          className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted] hover:text-[--color-text] hover:border-[--color-border-glow] transition-all"
        >
          ← Re-upload
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Semester Summary ──────────────────────────────── */}
      <section className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 animate-fade-in-delay">
        <h2 className="text-lg font-semibold mb-3">Semester Overview</h2>
        {loadingSummary ? (
          <div className="flex items-center gap-2 text-[--color-text-muted] text-sm py-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating semester analysis…
          </div>
        ) : summary ? (
          <div className="space-y-3">
            {summary.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-sm text-[--color-text-muted] leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[--color-text-dim]">Summary will appear after stress analysis.</p>
        )}
      </section>

      {/* ── Events Table ──────────────────────────────────── */}
      <section className="rounded-xl border border-[--color-border] bg-[--color-surface] overflow-hidden animate-fade-in-delay">
        <div className="px-5 py-4 border-b border-[--color-border]">
          <h2 className="text-lg font-semibold">Extracted Events</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--color-border] text-left text-[--color-text-dim]">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Subject</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium">Weight</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => {
                const subjectColor = getSubjectColor(event.subject);
                return (
                  <tr
                    key={i}
                    className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-hover] transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{event.title}</td>
                    <td className="px-5 py-3">
                      {event.subject && (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: subjectColor.bg,
                            color: subjectColor.text,
                          }}
                        >
                          {event.subject}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          event.type === "exam"
                            ? "bg-[--color-badge-exam] text-[--color-badge-exam-text]"
                            : "bg-[--color-badge-assignment] text-[--color-badge-assignment-text]"
                        }`}
                      >
                        {event.type === "exam" ? "Exam" : "Assignment"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[--color-text-muted]">{event.due_date}</td>
                    <td className="px-5 py-3 text-[--color-text-muted]">
                      {event.weight != null ? `${event.weight}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        id={`plan-btn-${i}`}
                        onClick={() => handleGeneratePlan(event)}
                        className="rounded-lg bg-[--color-primary]/20 px-3 py-1.5 text-xs font-semibold text-[--color-primary-hover] hover:bg-[--color-primary]/30 transition-all"
                      >
                        Plan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Stress Heatmap ────────────────────────────────── */}
      <section className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 animate-fade-in-delay-2">
        <h2 className="text-lg font-semibold mb-4">Weekly Stress Heatmap</h2>
        {loadingStress ? (
          <p className="text-[--color-text-muted] text-sm">Computing stress levels…</p>
        ) : Object.keys(stress).length === 0 ? (
          <p className="text-[--color-text-dim] text-sm">No stress data available.</p>
        ) : (
          <div className="space-y-2.5">
            {Object.entries(stress).map(([week, score]) => {
              const { bg, text, label } = getStressColor(score);
              const widthPct = Math.max(10, (score / maxStress) * 100);
              return (
                <div key={week} className="flex items-center gap-3">
                  <span className="text-xs text-[--color-text-dim] w-16 shrink-0 capitalize">
                    {week.replace("_", " ")}
                  </span>
                  <div className="flex-1 h-7 rounded-lg bg-[--color-background] overflow-hidden">
                    <div
                      className={`h-full rounded-lg ${bg} flex items-center px-3 transition-all duration-500`}
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className={`text-xs font-semibold ${text}`}>
                        {score} pts — {label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Study Plan ────────────────────────────────────── */}
      {(selectedEvent || plan.length > 0) && (
        <section className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold">
              Study Plan{selectedEvent ? `: ${selectedEvent.title}` : ""}
            </h2>
            {selectedEvent?.subject && (() => {
              const c = getSubjectColor(selectedEvent.subject);
              return (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: c.bg, color: c.text }}
                >
                  {selectedEvent.subject}
                </span>
              );
            })()}
          </div>
          {selectedEvent && (
            <p className="text-[--color-text-dim] text-xs mb-4">
              Due {selectedEvent.due_date} • {selectedEvent.weight != null ? `${selectedEvent.weight}%` : "N/A"} weight
            </p>
          )}

          {loadingPlan ? (
            <div className="flex items-center gap-2 text-[--color-text-muted] text-sm py-4">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating plan…
            </div>
          ) : (
            <div className="space-y-2">
              {plan.map((day, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-lg border border-[--color-border] bg-[--color-background] px-4 py-3 hover:border-[--color-border-glow] transition-all"
                >
                  <div className="shrink-0 w-24">
                    <span className="text-xs text-[--color-primary] font-semibold">
                      Day {i + 1}
                    </span>
                    <p className="text-xs text-[--color-text-dim] mt-0.5">{day.date}</p>
                  </div>
                  <p className="text-sm text-[--color-text]">{day.task}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
