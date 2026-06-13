/**
 * One-off RLS verification (not part of the app).
 *
 * Proves the DATABASE enforces access — not just the app. It signs in as real
 * users with the PUBLIC key (so RLS applies) and confirms:
 *   - a student can read their own attempt but NOT another student's,
 *   - the `questions` answer-key table is unreadable by any user client,
 *   - a teacher can read their batch student's attempt.
 *
 * Sets up a second student + a sample attempt via the service key first.
 * Run with:  npx tsx scripts/verify-rls.ts   (after applying 0003_rls.sql)
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, service, { auth: { persistSession: false } });

const STUDENT2 = { email: "student2@DriveScore.test", password: "Student2-Demo-2026" };

async function upsertAuthUser(email: string, password: string, fullName: string) {
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      await admin.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
      });
      return found.id;
    }
    if (data.users.length < 1000) break;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user.id;
}

async function authed(email: string, password: string) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

async function main() {
  console.log("\nRLS verification\n");

  // ── setup (service key) ──
  // Resolve the student1 row via the auth user so we get the one that is
  // actually linked to the login (handles duplicate seed runs gracefully).
  const { data: s1AuthList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const s1AuthUser = s1AuthList.users.find((u) => u.email?.toLowerCase() === "student@DriveScore.test");
  if (!s1AuthUser) throw new Error("student@DriveScore.test auth user not found — run npm run db:seed first");
  const { data: s1 } = await admin.from("students").select("id").eq("profile_id", s1AuthUser.id).limit(1).maybeSingle();
  if (!s1) throw new Error("No students row linked to student@DriveScore.test — run npm run db:seed first");

  const { data: centre } = await admin.from("centres").select("id").eq("name", "Demo NEET Centre").limit(1).maybeSingle();
  const { data: batch } = await admin.from("batches").select("id").eq("name", "NEET-2026 Batch A").limit(1).maybeSingle();

  // Second student (the "attacker").
  const s2uid = await upsertAuthUser(STUDENT2.email, STUDENT2.password, "Test Student Two");
  await admin.from("profiles").upsert({ id: s2uid, role: "student", centre_id: centre!.id, full_name: "Test Student Two" });
  const existing = await admin.from("students").select("id").eq("profile_id", s2uid).maybeSingle();
  if (!existing.data) {
    await admin.from("students").insert({ batch_id: batch!.id, name: "Test Student Two", profile_id: s2uid });
  }

  // A sample attempt owned by student #1 (Aarav).
  const { data: mock } = await admin.from("mocks").select("id").limit(1).single();
  const { data: mq } = await admin.from("mock_questions").select("question_id").eq("mock_id", mock!.id).order("position");
  const { data: att } = await admin
    .from("attempts")
    .insert({ mock_id: mock!.id, student_id: s1!.id, submitted_at: new Date().toISOString(), total_marks: 0, max_marks: 36, accuracy: 0 })
    .select("id")
    .single();
  await admin.from("answers").insert(
    (mq ?? []).slice(0, 3).map((m) => ({ attempt_id: att!.id, question_id: m.question_id, picked_index: 0, time_sec: 30 })),
  );
  const attemptId = att!.id;

  // ── checks (user-scoped, RLS applies) ──
  let ok = true;
  const check = (cond: boolean, msg: string) => {
    console.log(`  ${cond ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${msg}`);
    if (!cond) ok = false;
  };

  const c1 = await authed("student@DriveScore.test", "Student-Demo-2026");
  check(((await c1.from("attempts").select("id").eq("id", attemptId)).data?.length ?? 0) === 1, "student #1 can read their OWN attempt");
  check(((await c1.from("questions").select("id").limit(5)).data?.length ?? 0) === 0, "student #1 canNOT read the questions table (answer keys locked)");

  const c2 = await authed(STUDENT2.email, STUDENT2.password);
  check(((await c2.from("attempts").select("id").eq("id", attemptId)).data?.length ?? 0) === 0, "student #2 canNOT read student #1's attempt (DB-enforced isolation)");
  check(((await c2.from("answers").select("id").eq("attempt_id", attemptId)).data?.length ?? 0) === 0, "student #2 canNOT read student #1's answers");

  const ct = await authed("teacher@DriveScore.test", "Teacher-Demo-2026");
  check(((await ct.from("attempts").select("id").eq("id", attemptId)).data?.length ?? 0) === 1, "teacher CAN read their batch student's attempt");
  check(((await ct.from("questions").select("id").limit(5)).data?.length ?? 0) === 0, "teacher canNOT read the questions table");

  console.log(ok ? "\n\x1b[32m✓ RLS walls verified.\x1b[0m\n" : "\n\x1b[31m✗ Some RLS checks failed.\x1b[0m\n");
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error("verify-rls failed:", e.message ?? e);
  process.exit(1);
});
