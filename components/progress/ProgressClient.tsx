"use client";

/**
 * Student progress dashboard (client). Composes the rating-trend worm chart
 * with two supporting panels — chapter strengths/weaknesses and recent
 * attempts. Presentation only; all numbers are pre-computed on the server
 * (lib/db/progress.ts). Dark cinematic skin to match the rest of the student UI.
 */

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { TrendChart, type ChartSeries } from "@/components/progress/TrendChart";
import type { StudentProgress, ChapterStanding } from "@/lib/db/progress";
import type { Subject } from "@/lib/types";

const SUBJECT_COLOR: Record<Subject, string> = {
  Physics: "#5EC8FF",
  Chemistry: "#FFC454",
  Biology: "#00E0B8",
};

const SUBJECT_ABBR: Record<Subject, string> = {
  Physics: "Phy",
  Chemistry: "Chem",
  Biology: "Bio",
};

const LEVEL_TEXT: Record<string, string> = {
  Aspirant: "text-paper/70",
  Achiever: "text-energy",
  Scholar: "text-energy",
  Ranker: "text-reward",
  Topper: "text-reward",
  "White Coat": "text-[#B7AEFF]",
};

const fmt = (n: number) => n.toLocaleString("en-IN");
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Map a rating onto a 0–100% bar fill (700 → 1500 window). */
const barPct = (rating: number) =>
  Math.max(4, Math.min(100, Math.round(((rating - 700) / 800) * 100)));

function StandingRow({ c }: { c: ChapterStanding }) {
  const color = SUBJECT_COLOR[c.subject];
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate font-medium text-paper/90">
          <span className="mr-1.5 text-[10px] font-bold uppercase" style={{ color }}>
            {SUBJECT_ABBR[c.subject]}
          </span>
          {c.chapter}
        </span>
        <span className={`shrink-0 font-bold tabular-nums ${LEVEL_TEXT[c.level] ?? "text-paper"}`}>
          {fmt(c.rating)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: `${barPct(c.rating)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function ProgressClient({ progress }: { progress: StudentProgress }) {
  const { trend, recent, strengths, weaknesses, attemptCount } = progress;

  const series: ChartSeries[] = trend.map((s) => ({
    label: s.subject,
    color: SUBJECT_COLOR[s.subject],
    points: s.points,
  }));
  const hasTrend = attemptCount >= 2 && series.some((s) => s.points.length >= 2);

  return (
    <main className="student-skin landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-12 pt-7">
        {/* Header */}
        <header className="animate-fade-up flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-energy text-focusink shadow-[0_0_18px_-2px_rgba(0,224,184,0.6)]">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                Your progress
              </p>
              <h1 className="font-display text-lg font-extrabold text-paper">
                Are you improving?
              </h1>
            </div>
          </div>
          <Link href="/" className="btn-ghost-dark px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </header>

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
        {/* Rating trend */}
        <section className="animate-fade-up lg:col-span-2" style={{ animationDelay: "60ms" }}>
          <div className="card-glass-lg p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-bold text-paper">Skill rating over time</h2>
            </div>

            {hasTrend ? (
              <>
                <TrendChart series={series} />
                <div className="mt-3 flex flex-wrap gap-3">
                  {series.map((s) => (
                    <span key={s.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-paper/70">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-white/[0.04] px-4 py-6 text-center text-sm text-paper/60">
                Take a couple of practice tests and your rating trend will appear
                here — one climbing line per subject, from day one to today.
              </p>
            )}
          </div>
        </section>

        {/* Strengths & weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <section className="animate-fade-up grid gap-4 sm:grid-cols-2 lg:grid-cols-1" style={{ animationDelay: "120ms" }}>
            <div className="card-glass min-w-0 p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-energy">
                <TrendingUp className="h-4 w-4" /> Strongest lessons
              </h3>
              <div className="grid gap-3">
                {strengths.map((c) => (
                  <StandingRow key={`${c.subject}-${c.chapter}`} c={c} />
                ))}
              </div>
            </div>
            <div className="card-glass min-w-0 p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF9A91]">
                <TrendingDown className="h-4 w-4" /> Needs work
              </h3>
              <div className="grid gap-3">
                {weaknesses.length > 0 ? (
                  weaknesses.map((c) => (
                    <StandingRow key={`${c.subject}-${c.chapter}`} c={c} />
                  ))
                ) : (
                  <p className="text-xs text-paper/50">
                    Practice more chapters to surface your weak spots.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
        </div>

        {/* Recent attempts */}
        {recent.length > 0 && (
          <section className="animate-fade-up mt-6" style={{ animationDelay: "180ms" }}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-paper/45">
              Recent tests
            </h3>
            <div className="grid gap-2">
              {recent.map((a) => (
                <Link
                  key={a.attemptId}
                  href={`/report?attempt=${a.attemptId}`}
                  className="card-glass flex items-center gap-3 p-3.5 transition hover:bg-white/[0.08]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-paper">{a.title}</p>
                    <p className="text-[11px] text-paper/50">
                      {fmtDate(a.date)} · {a.marks}/{a.maxMarks} marks
                    </p>
                  </div>
                  {a.delta !== 0 && (
                    <span
                      className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-bold tabular-nums ${
                        a.delta > 0 ? "text-energy" : "text-[#FF9A91]"
                      }`}
                    >
                      <ArrowUpRight
                        className={`h-3.5 w-3.5 ${a.delta < 0 ? "rotate-90" : ""}`}
                      />
                      {a.delta > 0 ? "+" : ""}
                      {fmt(a.delta)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
