"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, Loader2, Lock } from "lucide-react";
import { updatePassword, type ResetState } from "@/app/reset-password/actions";

const initial: ResetState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (
        <>
          Updating <Loader2 className="h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          Set new password <Check className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(updatePassword, initial);

  return (
    <div className="card animate-fade-up p-6">
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/50">
            New password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/50">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Re-enter your new password"
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
    </div>
  );
}
