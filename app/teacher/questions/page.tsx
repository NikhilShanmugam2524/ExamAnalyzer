/**
 * Question Bank — Teacher (centre manager). Teacher-only.
 */

import Link from "next/link";
import { ArrowLeft, BookOpen, Library, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  listChapters,
  listQuestions,
  questionStats,
  type QuestionFilters,
} from "@/lib/db/questions";
import { SUBJECTS, DIFFICULTIES, indexToLetter } from "@/lib/questions/validate";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { CsvImport } from "@/components/admin/CsvImport";
import { DeleteQuestionButton } from "@/components/admin/DeleteQuestionButton";

export const dynamic = "force-dynamic";

const SUBJECT_PILL: Record<string, string> = {
  Physics: "bg-sky-50 text-sky-700",
  Chemistry: "bg-violet-50 text-violet-700",
  Biology: "bg-teal-50 text-teal-700",
};
const DIFFICULTY_PILL: Record<string, string> = {
  Easy: "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard: "bg-rose-50 text-rose-700",
};

export default async function TeacherQuestionBankPage({
  searchParams,
}: {
  searchParams: { subject?: string; difficulty?: string; chapter?: string; q?: string };
}) {
  const me = await requireRole("teacher");
  const centreId = me.profile.centreId;

  if (!centreId) {
    return (
      <Shell>
        <div className="card p-5 text-sm text-ink/60">
          Your account isn&apos;t linked to a centre yet.
        </div>
      </Shell>
    );
  }

  const filters: QuestionFilters = {
    subject: searchParams.subject || undefined,
    difficulty: searchParams.difficulty || undefined,
    chapter: searchParams.chapter || undefined,
    q: searchParams.q || undefined,
  };
  const hasFilters = Boolean(
    filters.subject || filters.difficulty || filters.chapter || filters.q,
  );

  const [questions, stats, chapters] = await Promise.all([
    listQuestions(centreId, filters),
    questionStats(centreId),
    listChapters(centreId),
  ]);

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/30";

  return (
    <Shell>
      <section className="animate-fade-up mt-6 grid grid-cols-4 gap-2">
        <Stat label="Total" value={stats.total} highlight />
        {stats.bySubject.map((s) => (
          <Stat key={s.subject} label={s.subject} value={s.count} />
        ))}
      </section>

      <section className="animate-fade-up mt-6">
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-deep" />
            <h2 className="font-display font-semibold text-ink">Add a question</h2>
          </div>
          <QuestionForm mode="create" />
        </div>
      </section>

      <section className="animate-fade-up mt-6">
        <CsvImport />
      </section>

      <section className="animate-fade-up mt-6">
        <div className="mb-2.5 flex items-center gap-2">
          <Library className="h-4 w-4 text-teal-deep" />
          <h2 className="font-display text-lg font-bold text-ink">
            Your questions ({questions.length})
          </h2>
        </div>

        <form
          method="get"
          action="/teacher/questions"
          className="card mb-3 grid grid-cols-2 gap-2 p-3 sm:grid-cols-5"
        >
          <div className="relative col-span-2 sm:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search text…"
              className={`${inputCls} pl-8`}
            />
          </div>
          <select name="subject" defaultValue={filters.subject ?? ""} className={inputCls}>
            <option value="">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="difficulty" defaultValue={filters.difficulty ?? ""} className={inputCls}>
            <option value="">Any level</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select name="chapter" defaultValue={filters.chapter ?? ""} className={inputCls}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="col-span-2 flex gap-2 sm:col-span-5">
            <button type="submit" className="btn-primary px-4 py-2 text-sm">
              Apply filters
            </button>
            {hasFilters && (
              <Link href="/teacher/questions" className="btn-ghost px-4 py-2 text-sm">
                Clear
              </Link>
            )}
          </div>
        </form>

        {questions.length === 0 ? (
          <div className="card p-5 text-sm text-ink/60">
            {hasFilters
              ? "No questions match these filters."
              : "No questions yet — add one above or import a CSV."}
          </div>
        ) : (
          <div className="card divide-y divide-black/[0.05]">
            {questions.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className={`pill ${SUBJECT_PILL[q.subject] ?? "bg-slate-100 text-slate-700"}`}>
                      {q.subject}
                    </span>
                    <span className={`pill ${DIFFICULTY_PILL[q.difficulty] ?? "bg-slate-100 text-slate-700"}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-[11px] text-ink/45">
                      {q.chapter} · {q.concept}
                    </span>
                  </div>
                  <p className="truncate text-sm text-ink">{q.text}</p>
                  <p className="mt-0.5 text-[11px] text-ink/45">
                    Answer: <strong className="text-ink/70">{indexToLetter(q.answerIndex)}</strong>{" "}
                    · par {q.parTimeSec}s
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/teacher/questions/${q.id}/edit`}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-deep transition hover:bg-teal/5"
                  >
                    Edit
                  </Link>
                  <DeleteQuestionButton id={q.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 pb-14 pt-6">
      <header className="animate-fade-up flex items-center gap-3">
        <Link
          href="/teacher"
          className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white text-ink/70 transition hover:bg-black/[0.03]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
            Centre · Question Bank
          </p>
          <h1 className="font-display text-lg font-bold text-ink">Your questions</h1>
        </div>
      </header>
      {children}
    </main>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? "bg-ink text-white" : "card"}`}>
      <p className={`font-display text-xl font-bold tabular-nums ${highlight ? "text-white" : "text-ink"}`}>
        {value}
      </p>
      <p className={`text-[11px] font-medium ${highlight ? "text-white/70" : "text-ink/50"}`}>
        {label}
      </p>
    </div>
  );
}
