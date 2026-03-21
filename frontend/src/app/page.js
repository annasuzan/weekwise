import Link from "next/link";

/**
 * Landing page — directs users to paste their syllabus.
 */
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
      {/* Hero */}
      <div className="mb-8">

        <h1 className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-r from-[--color-primary] to-[--color-accent] bg-clip-text text-transparent">
          WeekWise
        </h1>
        <p className="text-[--color-text-muted] text-lg max-w-md mx-auto">
          Paste your syllabus. Visualize your stress. Generate a study plan.
          All in seconds.
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/upload"
        className="btn-glow inline-flex items-center gap-2 rounded-xl bg-[--color-primary] px-8 py-3.5 text-base font-semibold text-white hover:bg-[--color-primary-hover] transition-all shadow-lg shadow-[#b85c3c]/15"
      >
        Get Started
        <span className="text-lg">→</span>
      </Link>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-2xl">
        {[
          { label: "Parse Syllabus", desc: "Extract events automatically" },
          { label: "Stress Heatmap", desc: "See your busiest weeks" },
          { label: "Study Plans", desc: "Smart daily schedules" },
        ].map((f, i) => (
          <div
            key={f.label}
            className={`rounded-xl border border-[--color-border] bg-[--color-surface] p-5 text-center hover:border-[--color-border-glow] transition-all hover:scale-[1.02] ${i === 0
              ? "animate-fade-in"
              : i === 1
                ? "animate-fade-in-delay"
                : "animate-fade-in-delay-2"
              }`}
          >
            <span className="text-2xl block mb-2">{f.icon}</span>
            <p className="font-semibold text-sm mb-1">{f.label}</p>
            <p className="text-xs text-[--color-text-dim]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
