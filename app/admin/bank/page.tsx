/**
 * DriveScore GLOBAL Question Bank (platform super-admin).
 *
 * The platform-owned pool (centre_id NULL) that powers student self-practice:
 * lesson-by-lesson tests and the shuffled full NEET mock. Admin can bulk-import
 * (CSV) for scale, add single questions, and review/delete recent ones.
 *
 * Dark themed to match the admin dashboard + login surfaces.
 */

import Link from "next/link";
import { ArrowLeft, BookOpen, Database, ImagePlus, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  globalQuestionStats,
  listGlobalQuestions,
} from "@/lib/db/globalQuestions";
import { indexToLetter } from "@/lib/questions/validate";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { BankCsvImport } from "@/components/admin/BankCsvImport";
import { BankQuestionForm } from "@/components/admin/BankQuestionForm";
import { BankImageQuestionForm } from "@/components/admin/BankImageQuestionForm";
import { BankDeleteButton } from "@/components/admin/BankDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminBankPage() {
  await requireRole("admin");

  let stats = { total: 0, bySubject: [] as { subject: string; count: number }[] };
  let recent: Awaited<ReturnType<typeof listGlobalQuestions>> = [];
  try {
    [stats, recent] = await Promise.all([
      globalQuestionStats(),
      listGlobalQuestions({}, 50),
    ]);
  } catch {
    // table/migration not ready — show empty state gracefully
  }

  return (
    <main className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-10 pt-6">
        {/* Header */}
        <header className="animate-fade-up flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-energy/15 text-energy ring-1 ring-energy/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                DriveScore Global Bank
              </p>
              <h1 className="font-display text-lg font-bold text-paper">
                Question Bank
              </h1>
            </div>
          </div>
          <Link href="/admin" className="btn-ghost-dark px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </header>

        <p className="animate-fade-up mt-3 text-sm text-paper/55">
          These platform-wide questions power student self-practice —
          lesson-by-lesson tests and the shuffled full NEET mock. Available to
          every student, free.
        </p>

        {/* Stats */}
        <section className="animate-fade-up mt-6 grid grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} highlight />
          {stats.bySubject.map((s) => (
            <StatCard key={s.subject} label={s.subject} value={s.count} />
          ))}
        </section>

        {/* Bulk import — primary path for scale */}
        <section className="animate-fade-up mt-6">
          <BankCsvImport />
        </section>

        {/* Single add (collapsible) */}
        <section className="animate-fade-up mt-6">
          <details className="card-glass p-5 [&_summary]:cursor-pointer">
            <summary className="flex items-center gap-2 font-display font-semibold text-paper">
              <Plus className="h-4 w-4 text-energy" />
              Add a single question
            </summary>
            <div className="mt-4">
              <BankQuestionForm mode="create" />
            </div>
          </details>
        </section>

        {/* Diagram / image question (collapsible) */}
        <section className="animate-fade-up mt-3">
          <details className="card-glass p-5 [&_summary]:cursor-pointer">
            <summary className="flex items-center gap-2 font-display font-semibold text-paper">
              <ImagePlus className="h-4 w-4 text-energy" />
              Add a diagram (image) question
            </summary>
            <div className="mt-4">
              <BankImageQuestionForm />
            </div>
          </details>
        </section>

        {/* Recent questions */}
        <section className="animate-fade-up mt-6">
          <div className="mb-2.5 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-energy" />
            <h2 className="font-display text-lg font-bold text-paper">
              Recent questions ({recent.length})
            </h2>
          </div>

          {recent.length === 0 ? (
            <div className="card-glass p-5 text-sm text-paper/60">
              No global questions yet — import a CSV or add one above to get started.
            </div>
          ) : (
            <div className="card-glass divide-y divide-white/[0.06]">
              {recent.map((q) => (
                <div key={q.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-paper/90">{q.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="pill bg-energy/15 text-energy">{q.subject}</span>
                      <span className="pill bg-white/10 text-paper/60">{q.chapter}</span>
                      <span className="pill bg-accent2/20 text-[#B7AEFF]">{q.difficulty}</span>
                      <span className="text-paper/40">
                        Ans: {indexToLetter(q.answerIndex)} · {q.parTimeSec}s
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/admin/bank/${q.id}/edit`}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-paper/45 transition hover:bg-white/5 hover:text-energy"
                    >
                      Edit
                    </Link>
                    <BankDeleteButton id={q.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="card-glass p-3 text-center">
      <p
        className={`font-display text-2xl font-bold tabular-nums ${
          highlight ? "text-energy" : "text-paper"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-paper/50">{label}</p>
    </div>
  );
}
