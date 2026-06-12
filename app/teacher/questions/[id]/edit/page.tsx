/**
 * Edit a single bank question. Teacher-only.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getQuestion } from "@/lib/db/questions";
import { QuestionForm } from "@/components/admin/QuestionForm";

export const dynamic = "force-dynamic";

export default async function TeacherEditQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireRole("teacher");
  const centreId = me.profile.centreId;
  const question = centreId ? await getQuestion(centreId, params.id) : null;

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 pb-14 pt-6">
      <header className="animate-fade-up flex items-center gap-3">
        <Link
          href="/teacher/questions"
          className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white text-ink/70 transition hover:bg-black/[0.03]"
          aria-label="Back to question bank"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
            Centre · Question Bank
          </p>
          <h1 className="font-display text-lg font-bold text-ink">Edit question</h1>
        </div>
      </header>

      <section className="animate-fade-up mt-6">
        {question ? (
          <div className="card p-5">
            <QuestionForm mode="edit" question={question} />
          </div>
        ) : (
          <div className="card p-5 text-sm text-ink/60">
            That question isn&apos;t in your bank.{" "}
            <Link href="/teacher/questions" className="font-semibold text-teal-deep hover:underline">
              Back to the bank
            </Link>
            .
          </div>
        )}
      </section>
    </main>
  );
}
