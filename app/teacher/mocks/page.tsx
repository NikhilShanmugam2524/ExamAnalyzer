/**
 * Mocks list — Teacher (centre manager). Teacher-only.
 */

import Link from "next/link";
import { ArrowLeft, FileStack, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listMocksForCentre } from "@/lib/db/mocks";
import { MockRowActions } from "@/components/admin/MockRowActions";

export const dynamic = "force-dynamic";

export default async function TeacherMocksPage() {
  const me = await requireRole("teacher");
  const centreId = me.profile.centreId;
  const mocks = centreId ? await listMocksForCentre(centreId) : [];

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
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
            Centre · Mocks
          </p>
          <h1 className="font-display text-lg font-bold text-ink">Mock tests</h1>
        </div>
        <Link href="/teacher/mocks/new" className="btn-primary px-3.5 py-2 text-sm">
          <Plus className="h-4 w-4" /> New
        </Link>
      </header>

      {!centreId ? (
        <div className="card mt-6 p-5 text-sm text-ink/60">
          Your account isn&apos;t linked to a centre yet.
        </div>
      ) : mocks.length === 0 ? (
        <div className="card mt-6 p-6 text-center">
          <FileStack className="mx-auto h-7 w-7 text-ink/30" />
          <p className="mt-2 font-display font-semibold text-ink">No mocks yet</p>
          <p className="mt-1 text-sm text-ink/55">
            Build one from your question bank and publish it to a batch.
          </p>
          <Link href="/teacher/mocks/new" className="btn-primary mt-4 inline-flex text-sm">
            Build a mock <Plus className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="animate-fade-up mt-6 card divide-y divide-black/[0.05]">
          {mocks.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="mb-0.5 flex items-center gap-2">
                  <span
                    className={`pill ${
                      m.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {m.status}
                  </span>
                  <Link
                    href={`/teacher/mocks/${m.id}/edit`}
                    className="truncate font-display font-semibold text-ink hover:underline"
                  >
                    {m.title}
                  </Link>
                </div>
                <p className="text-xs text-ink/55">
                  {m.questionCount} {m.questionCount === 1 ? "question" : "questions"} ·{" "}
                  {m.batchName ?? "no batch"}
                </p>
              </div>
              <MockRowActions id={m.id} status={m.status} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
