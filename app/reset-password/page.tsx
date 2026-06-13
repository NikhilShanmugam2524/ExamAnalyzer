/**
 * Set-new-password page.
 *
 * Reached after /auth/confirm establishes a recovery session. If there's no
 * session (link expired or opened directly), we show a friendly notice instead
 * of the form.
 */

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="animate-fade-up mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal text-white shadow-sm">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            {user ? "Choose a new password" : "Link expired"}
          </h1>
          <p className="text-xs font-medium text-teal-deep">
            {user ? "Almost done" : "Request a fresh reset link"}
          </p>
        </div>
      </div>

      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="card animate-fade-up p-6 text-center">
          <p className="text-sm text-ink/60">
            This password reset link is invalid or has expired. Reset links are
            single-use and valid for 1 hour.
          </p>
          <Link
            href="/forgot-password"
            className="btn-primary mt-5 inline-flex w-full justify-center"
          >
            Request a new link
          </Link>
        </div>
      )}
    </main>
  );
}
