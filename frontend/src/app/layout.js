import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "WeekWise",
  description:
    "Paste your syllabus, visualize stress, and generate study plans.",
};

/**
 * Root layout — shared nav bar + page wrapper.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {/* ── Navigation ──────────────────────────────────── */}
        <nav className="sticky top-0 z-50 border-b border-[--color-border] bg-[--color-surface]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">

              <span className="text-lg font-bold tracking-tight text-[--color-primary] group-hover:text-[--color-accent] transition-colors">
                WeekWise
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-1">
              <Link
                href="/upload"
                className="rounded-lg px-4 py-2 text-sm font-medium text-[--color-text-muted] hover:text-[--color-text] hover:bg-[--color-surface-hover] transition-all"
              >
                Upload
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg px-4 py-2 text-sm font-medium text-[--color-text-muted] hover:text-[--color-text] hover:bg-[--color-surface-hover] transition-all"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Page content ────────────────────────────────── */}
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
