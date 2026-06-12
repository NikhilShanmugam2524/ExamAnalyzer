/**
 * Edit a single GLOBAL bank question (platform super-admin).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getGlobalQuestion } from "@/lib/db/globalQuestions";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { BankQuestionForm } from "@/components/admin/BankQuestionForm";

export const dynamic = "force-dynamic";

export default async function EditGlobalQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("admin");

  const question = await getGlobalQuestion(params.id);
  if (!question) notFound();

  return (
    <main className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-2xl px-5 pb-10 pt-6">
        <header className="animate-fade-up mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-lg font-bold text-paper">Edit question</h1>
          <Link href="/admin/bank" className="btn-ghost-dark px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </header>

        <div className="card-glass animate-fade-up p-5">
          <BankQuestionForm mode="edit" question={question} />
        </div>
      </div>
    </main>
  );
}
