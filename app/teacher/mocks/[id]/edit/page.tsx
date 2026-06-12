/**
 * Edit a mock — Teacher (centre manager). Teacher-only.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listBatchesForCentre } from "@/lib/db/queries";
import { listQuestions, listChapters } from "@/lib/db/questions";
import { getMockForEdit, type PickerQuestion } from "@/lib/db/mocks";
import { MockBuilder } from "@/components/admin/MockBuilder";

export const dynamic = "force-dynamic";

export default async function TeacherEditMockPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireRole("teacher");
  const centreId = me.profile.centreId;

  const mock = centreId ? await getMockForEdit(centreId, params.id) : null;

  const [bank, batches, chapters] = centreId
    ? await Promise.all([
        listQuestions(centreId),
        listBatchesForCentre(centreId),
        listChapters(centreId),
      ])
    : [[], [], []];

  const questions: PickerQuestion[] = bank.map((q) => ({
    id: q.id,
    subject: q.subject,
    chapter: q.chapter,
    concept: q.concept,
    difficulty: q.difficulty,
    parTimeSec: q.parTimeSec,
    text: q.text,
    options: q.options,
  }));

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 pb-14 pt-6">
      <header className="animate-fade-up flex items-center gap-3">
        <Link
          href="/teacher/mocks"
          className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white text-ink/70 transition hover:bg-black/[0.03]"
          aria-label="Back to mocks"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
            Centre · Mocks
          </p>
          <h1 className="font-display text-lg font-bold text-ink">Edit mock</h1>
        </div>
      </header>

      <section className="animate-fade-up mt-6">
        {mock ? (
          <MockBuilder
            questions={questions}
            batches={batches.map((b) => ({ id: b.id, name: b.name }))}
            chapters={chapters}
            initial={{
              id: mock.id,
              title: mock.title,
              batchId: mock.batchId,
              questionIds: mock.questionIds,
              maxAttempts: mock.maxAttempts,
            }}
          />
        ) : (
          <div className="card p-5 text-sm text-ink/60">
            That mock isn&apos;t in your centre.{" "}
            <Link href="/teacher/mocks" className="font-semibold text-teal-deep hover:underline">
              Back to mocks
            </Link>
            .
          </div>
        )}
      </section>
    </main>
  );
}
