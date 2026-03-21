"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseSyllabus, uploadPdf } from "@/lib/api";

const PLACEHOLDER = `Paste your syllabus here. Example:

Midterm Exam - April 15, 2026 - 30%
Final Exam - June 10, 2026 - 40%
Research Paper due 2026-05-01 worth 15%
Problem Set 1 - 04/01/2026 - 5%
Problem Set 2 - 2026-04-20 - 5%
Group Project due May 20, 2026 - 5%`;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // State
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [pdfFiles, setPdfFiles] = useState([]);     // multiple files
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Handle text submission ──────────────────────────────
  const handleTextSubmit = async () => {
    if (!text.trim()) {
      setError("Please paste your syllabus text first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await parseSyllabus(text);
      localStorage.setItem("autopilot_events", JSON.stringify(data.events));
      localStorage.removeItem("autopilot_summary");
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to parse syllabus. Is the backend running on port 8000?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Handle PDF submission ───────────────────────────────
  const handlePdfSubmit = async () => {
    if (pdfFiles.length === 0) {
      setError("Please select or drop at least one PDF file.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await uploadPdf(pdfFiles);
      if (data.error) {
        setError(data.error);
        return;
      }
      localStorage.setItem("autopilot_events", JSON.stringify(data.events));
      localStorage.removeItem("autopilot_summary");
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to parse PDFs. Is the backend running on port 8000?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Add files (deduplicates by name) ────────────────────
  const addFiles = (newFiles) => {
    const existingNames = new Set(pdfFiles.map((f) => f.name));
    const toAdd = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" && !existingNames.has(f.name)
    );
    if (toAdd.length === 0 && newFiles.length > 0) {
      setError("Only PDF files are accepted, or files already added.");
      return;
    }
    setPdfFiles((prev) => [...prev, ...toAdd]);
    setError(null);
  };

  // ── Remove a file by index ─────────────────────────────
  const removeFile = (index) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Drag & drop handlers ────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    // Reset input so user can re-select the same file if removed
    e.target.value = "";
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Upload Syllabus
        </h1>
        <p className="text-[--color-text-muted]">
          Upload PDFs or paste text. We&apos;ll use AI to extract all
          important dates, exams, and assignments across all your courses.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-[--color-surface] border border-[--color-border] mb-6 w-fit">
        <button
          onClick={() => { setMode("text"); setError(null); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "text"
              ? "bg-[--color-primary] text-white shadow-md"
              : "text-[--color-text-muted] hover:text-[--color-text]"
          }`}
        >
          Paste Text
        </button>
        <button
          onClick={() => { setMode("pdf"); setError(null); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "pdf"
              ? "bg-[--color-primary] text-white shadow-md"
              : "text-[--color-text-muted] hover:text-[--color-text]"
          }`}
        >
          Upload PDFs
        </button>
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-6 animate-fade-in-delay">

        {/* ── Text mode ──────────────────────────────────── */}
        {mode === "text" && (
          <>
            <textarea
              id="syllabus-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={12}
              className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-4 py-3 text-sm text-[--color-text] placeholder-[--color-text-dim] focus:outline-none focus:border-[--color-border-glow] focus:ring-1 focus:ring-[--color-border-glow] transition-all resize-y"
            />
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[--color-text-dim]">
                Supports YYYY-MM-DD, MM/DD/YYYY, and Month Day, Year formats
              </p>
              <button
                id="submit-syllabus"
                onClick={handleTextSubmit}
                disabled={loading}
                className="btn-glow rounded-xl bg-[--color-primary] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[--color-primary-hover] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#b85c3c]/15"
              >
                {loading ? <LoadingSpinner label="Parsing…" /> : "Parse Syllabus →"}
              </button>
            </div>
          </>
        )}

        {/* ── PDF mode ───────────────────────────────────── */}
        {mode === "pdf" && (
          <>
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-[--color-border-glow] bg-[--color-primary]/10"
                  : "border-[--color-border] hover:border-[--color-border-glow] hover:bg-[--color-surface-hover]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm font-medium text-[--color-text-muted]">
                Drop syllabus PDFs here, or click to browse
              </p>
              <p className="text-xs text-[--color-text-dim] mt-1">
                You can upload multiple files at once
              </p>
            </div>

            {/* File list */}
            {pdfFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-[--color-text-muted] mb-2">
                  {pdfFiles.length} file{pdfFiles.length !== 1 ? "s" : ""} selected
                </p>
                {pdfFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-background] px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[--color-primary]/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[--color-primary]">
                          PDF
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[--color-text] truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-[--color-text-dim]">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="shrink-0 ml-3 rounded-lg p-1.5 text-[--color-text-dim] hover:text-[#5e7350] hover:bg-red-500/10 transition-all"
                      title="Remove file"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[--color-text-dim]">
                All PDFs are combined and parsed together by AI
              </p>
              <button
                id="submit-pdf"
                onClick={handlePdfSubmit}
                disabled={loading || pdfFiles.length === 0}
                className="btn-glow rounded-xl bg-[--color-primary] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[--color-primary-hover] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#b85c3c]/15"
              >
                {loading ? (
                  <LoadingSpinner label={`Parsing ${pdfFiles.length} file${pdfFiles.length !== 1 ? "s" : ""}…`} />
                ) : (
                  `Parse ${pdfFiles.length} PDF${pdfFiles.length !== 1 ? "s" : ""} →`
                )}
              </button>
            </div>
          </>
        )}

        {/* Error banner */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

    </div>
  );
}

/** Small loading spinner component */
function LoadingSpinner({ label }) {
  return (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </span>
  );
}
