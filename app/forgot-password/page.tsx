/**
 * Forgot-password page — request a reset link by email.
 */

import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const expired = searchParams.error === "expired";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="animate-fade-up mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal text-white shadow-sm">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            Reset password
          </h1>
          <p className="text-xs font-medium text-teal-deep">
            We&apos;ll email you a secure link
          </p>
        </div>
      </div>

      {expired && (
        <p className="animate-fade-up mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          That reset link has expired or was already used. Request a new one
          below.
        </p>
      )}

      <ForgotPasswordForm />
    </main>
  );
}
