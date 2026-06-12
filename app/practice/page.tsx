/**
 * Student self-practice hub (`/practice`).
 *
 * Two SynapTest-provided pathways over the global question pool:
 *   1. Full NEET Mock  — shuffled 45 Phy + 45 Chem + 90 Bio, fresh each time.
 *   2. Lesson practice — pick a subject → chapter → focused test.
 *
 * Each "start" generates a personal mock and drops the student into the existing
 * test flow. Dark cinematic skin to match the student home.
 */

import Link from "next/link";
import {
  ArrowLeft,
  Atom,
  ChevronDown,
  Dna,
  FlaskConical,
  Play,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { requireRole, getCurrentStudent } from "@/lib/auth";
import { listGlobalSyllabus, NEET_PATTERN } from "@/lib/db/practice";
import {
  getChapterRatings,
  chapterRatingKey,
  type ChapterRating,
} from "@/lib/db/ratings";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { startFullMock } from "./actions";

export const dynamic = "force-dynamic";

const SUBJECT_ICON = {
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Dna,
} as const;

const TOTAL_NEET = NEET_PATTERN.reduce((s, p) => s + p.count, 0);

/** Per-level accent for the small lesson rating badges. */
const LEVEL_BADGE: Record<string, string> = {
  Aspirant: "bg-white/10 text-paper/70",
  Achiever: "bg-energy/15 text-energy",
  Scholar: "bg-energy/15 text-energy",
  Ranker: "bg-reward/15 text-reward",
  Topper: "bg-reward/15 text-reward",
  "White Coat": "bg-accent2/20 text-[#B7AEFF]",
};

export default async function PracticePage({
  searchParams,
}: {
  searchParams: { error?: string; track?: string };
}) {
  await requireRole("student");

  const track: "pyq" | "ai" = searchParams.track === "ai" ? "ai" : "pyq";
  let syllabus: Awaited<ReturnType<typeof listGlobalSyllabus>> = [];
  try {
    syllabus = await listGlobalSyllabus(track);
  } catch {
    syllabus = [];
  }

  // Per-chapter ratings for the logged-in student (empty until they practise).
  let chapterRatings = new Map<string, ChapterRating>();
  try {
    const student = await getCurrentStudent();
    if (student) chapterRatings = await getChapterRatings(student.id);
  } catch {
    chapterRatings = new Map();
  }

  const errorMsg =
    searchParams.error === "empty"
      ? "That selection has no questions yet — try another, or check back soon."
      : searchParams.error === "invalid"
        ? "Please pick a valid subject and chapter."
        : null;

  return (
    <main className="student-skin landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-12 pt-7">
        {/* Header */}
        <header className="animate-fade-up flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-energy text-focusink shadow-[0_0_18px_-2px_rgba(0,224,184,0.6)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                SynapTest Practice
              </p>
              <h1 className="font-display text-lg font-extrabold text-paper">
                Sharpen your prep
              </h1>
            </div>
          </div>
          <Link href="/" className="btn-ghost-dark px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </header>

        {errorMsg && (
          <p className="animate-fade-up mt-4 rounded-xl bg-pop/15 px-4 py-3 text-sm font-medium text-[#FF9A91]">
            {errorMsg}
          </p>
        )}

        {/* Full NEET mock */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: "60ms" }}>
          <form action={startFullMock}>
            <button
              type="submit"
              className="card-glass-lg group relative w-full overflow-hidden p-6 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-energy/25 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-energy text-focusink shadow-[0_0_24px_-4px_rgba(0,224,184,0.7)]">
                  <Shuffle className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-energy/80">
                    Full NEET pattern
                  </p>
                  <h2 className="font-display text-xl font-extrabold text-paper">
                    Start a Full Mock
                  </h2>
                  <p className="mt-1 text-sm text-paper/60">
                    {TOTAL_NEET} questions ({NEET_PATTERN.map((p) => `${p.count} ${p.subject.slice(0, 3)}`).join(" · ")}),
                    freshly shuffled every time.
                  </p>
                </div>
                <Play className="h-6 w-6 shrink-0 text-energy transition group-hover:translate-x-0.5" />
              </div>
            </button>
          </form>
        </section>

        {/* Lesson practice — two tracks */}
        <section className="animate-fade-up mt-8" style={{ animationDelay: "120ms" }}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-paper/45">
            Practice by lesson
          </h3>

          {/* Track tabs: real past papers vs AI-generated */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1">
            <Link
              href="/practice?track=pyq"
              className={`rounded-xl px-3 py-2 text-center text-sm font-bold transition ${track === "pyq" ? "bg-energy text-focusink" : "text-paper/60 hover:text-paper"}`}
            >
              Past Papers
            </Link>
            <Link
              href="/practice?track=ai"
              className={`rounded-xl px-3 py-2 text-center text-sm font-bold transition ${track === "ai" ? "bg-energy text-focusink" : "text-paper/60 hover:text-paper"}`}
            >
              AI Practice
            </Link>
          </div>

          {syllabus.length === 0 ? (
            <div className="card-glass p-5 text-sm text-paper/60">
              {track === "ai"
                ? "No AI questions yet. Once generated, an adaptive easy→hard set appears here per chapter."
                : "The SynapTest question bank is being prepared — lesson practice will appear here soon."}
            </div>
          ) : (
            <div className="grid gap-3">
              {syllabus.map((s) => {
                const Icon = SUBJECT_ICON[s.subject];
                return (
                  <details key={s.subject} className="card-glass overflow-hidden">
                    <summary className="flex cursor-pointer items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-paper">{s.subject}</p>
                        <p className="text-xs text-paper/55">
                          {s.chapters.length} {s.chapters.length === 1 ? "chapter" : "chapters"} ·{" "}
                          {s.questionCount} questions
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-paper/40 transition" />
                    </summary>

                    <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                      {s.chapters.map((c) => {
                        const cr = chapterRatings.get(
                          chapterRatingKey(s.subject, c.chapter),
                        );
                        return (
                        <div
                          key={c.chapter}
                          className="flex items-center gap-3 px-4 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-paper/90">
                              {c.chapter}
                            </p>
                            <p className="text-[11px] text-paper/45">
                              {c.questionCount} {c.questionCount === 1 ? "question" : "questions"}
                            </p>
                          </div>
                          {cr && (
                            <span
                              className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                                LEVEL_BADGE[cr.level] ?? LEVEL_BADGE.Aspirant
                              }`}
                              title={`${cr.level} · rating ${cr.rating}`}
                            >
                              {cr.level}
                              <span className="tabular-nums opacity-70">{cr.rating}</span>
                            </span>
                          )}
                          <Link
                            href={`/practice/climb?subject=${encodeURIComponent(s.subject)}&chapter=${encodeURIComponent(c.chapter)}&source=${track}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-energy/15 px-3.5 py-2 text-xs font-bold text-energy transition hover:bg-energy/25"
                          >
                            Practice <Play className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
