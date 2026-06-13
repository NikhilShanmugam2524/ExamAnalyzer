"use server";

/**
 * Set a new password.
 *
 * Runs with the recovery session established by /auth/confirm. Validates, calls
 * updateUser, then signs the (now fully authenticated) user straight into their
 * role's landing page.
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/queries";
import { landingFor } from "@/lib/auth";

export type ResetState = { error: string | null };

export async function updatePassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "The two passwords don't match." };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  const profile = await getProfile(user.id);
  redirect(landingFor(profile?.role ?? "student"));
}
