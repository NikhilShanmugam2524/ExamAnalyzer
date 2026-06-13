"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { requestReset, type ForgotState } from "@/app/forgot-password/actions";

const initial: ForgotState = { error: null, sent: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>
          Sending <Loader2 className="h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          Send reset link <Send className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestReset, initial);

  if (state.sent) {
    return (
      <div className="card animate-fade-up p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal-deep">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">Check your email</h2>
        <p className="mt-1.5 text-sm text-ink/60">
          If an account exists for that address, we&apos;ve sent a link to reset
          your password. The link expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="card animate-fade-up p-6">
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/50"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@centre.com"
              className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
            />
          </div>
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <Link
        href="/login"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </div>
  );
}
