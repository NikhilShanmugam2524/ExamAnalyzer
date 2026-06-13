/**
 * Public self-signup page. Students and teachers create their own account and
 * pick the centre they belong to (teachers also enter a centre join code).
 */

import { listCentresForSignup } from "@/lib/db/admin";
import { SignupForm } from "@/components/auth/SignupForm";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  let centres: { id: string; name: string }[] = [];
  try {
    centres = await listCentresForSignup();
  } catch {
    centres = [];
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="animate-fade-up mb-8">
        <Logo size={44} wordmarkClassName="text-2xl text-ink" />
        <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">
          Create your account
        </h1>
        <p className="text-xs font-medium text-teal-deep">Join your coaching centre</p>
      </div>

      {centres.length === 0 ? (
        <div className="card animate-fade-up p-6 text-sm text-ink/60">
          No coaching centres are set up yet. Ask your centre to get onboarded
          with DriveScore first.
        </div>
      ) : (
        <SignupForm centres={centres} />
      )}
    </main>
  );
}
