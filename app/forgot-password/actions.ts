"use server";

/**
 * Forgot-password: send the reset email.
 *
 * Calls Supabase Auth's resetPasswordForEmail with a redirect back to our
 * /auth/confirm route handler (which establishes a recovery session and lands
 * the user on /reset-password). We ALWAYS report success — never reveal whether
 * an email is registered.
 */

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ForgotState = { error: string | null; sent: boolean };

export async function requestReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address.", sent: false };

  const origin =
    headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`;

  const supabase = createSupabaseServerClient();
  // Errors here (e.g. rate limits) are swallowed so we don't leak account
  // existence; genuine config problems show up in the server logs.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) console.error("resetPasswordForEmail:", error.message);

  return { error: null, sent: true };
}
