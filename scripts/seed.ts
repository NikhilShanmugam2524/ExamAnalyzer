/**
 * Seed the DriveScore database from the existing reference data.
 *
 * Reuses `data/questions.ts` as the single source of truth so the DB matches
 * what the app shipped with: one demo centre + batch + students, all 18
 * questions, and the fixed 9-question mock (linked in order).
 *
 * Run with:  npm run db:seed
 *
 * Idempotent: it first removes any prior "Demo NEET Centre" (which cascades to
 * its batches, students, questions, mocks and attempts) before re-seeding.
 *
 * Uses the SECRET service_role key — this script runs locally on the server,
 * never in the browser.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  QUESTION_BANK,
  MOCK_QUESTION_IDS,
  DEMO_STUDENTS,
} from "../data/questions";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "✗ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "in .env.local (see .env.example).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CENTRE_NAME = "Demo NEET Centre";
const BATCH_NAME = "NEET-2026 Batch A";
const MOCK_TITLE = "Weekend NEET Mock — Set 1";

/**
 * Create or update an auth user (email pre-confirmed so they can log in
 * immediately). Idempotent: updates the password if the email already exists.
 */
async function upsertAuthUser(
  email: string,
  password: string,
  fullName: string,
): Promise<string> {
  // Find an existing user with this email (paginate to be safe).
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) {
      await supabase.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      return found.id;
    }
    if (data.users.length < 1000) break;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user.id;
}

async function upsertProfile(
  id: string,
  role: "admin" | "teacher" | "student",
  centreId: string,
  fullName: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id, role, centre_id: centreId, full_name: fullName });
  if (error) throw error;
}

/** Read a SEED_* credential pair; returns null if either half is missing. */
function seedCreds(prefix: string): { email: string; password: string } | null {
  const email = process.env[`SEED_${prefix}_EMAIL`];
  const password = process.env[`SEED_${prefix}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password };
}

async function main() {
  console.log("Seeding DriveScore…\n");

  // 1. Clean slate — remove any prior demo centre (cascades to everything).
  const { data: existing } = await supabase
    .from("centres")
    .select("id")
    .eq("name", CENTRE_NAME);
  if (existing && existing.length > 0) {
    await supabase
      .from("centres")
      .delete()
      .in(
        "id",
        existing.map((c) => c.id),
      );
    console.log(`  • cleared ${existing.length} existing "${CENTRE_NAME}"`);
  }

  // 2. Centre.
  const { data: centre, error: cErr } = await supabase
    .from("centres")
    .insert({ name: CENTRE_NAME })
    .select("id")
    .single();
  if (cErr) throw cErr;
  console.log("  • centre created");

  // 3. Batch.
  const { data: batch, error: bErr } = await supabase
    .from("batches")
    .insert({ centre_id: centre.id, name: BATCH_NAME, exam_year: 2026 })
    .select("id")
    .single();
  if (bErr) throw bErr;
  console.log("  • batch created");

  // 4. Students (includes the "Aarav Menon" stand-in used in the report).
  const { data: insertedStudents, error: sErr } = await supabase
    .from("students")
    .insert(
      DEMO_STUDENTS.map((s) => ({
        batch_id: batch.id,
        centre_id: centre.id, // centre is the unit of membership (batch optional)
        name: s.name,
      })),
    )
    .select("id, name");
  if (sErr) throw sErr;
  console.log(`  • ${DEMO_STUDENTS.length} students created`);

  // 5. Questions — all 18, tagged to this centre.
  const { data: insertedQuestions, error: qErr } = await supabase
    .from("questions")
    .insert(
      QUESTION_BANK.map((q) => ({
        centre_id: centre.id,
        subject: q.subject,
        chapter: q.chapter,
        concept: q.concept,
        difficulty: q.difficulty,
        par_time_sec: q.parTimeSec,
        text: q.text,
        options: q.options,
        answer_index: q.answerIndex,
      })),
    )
    .select("id, text");
  if (qErr) throw qErr;
  console.log(`  • ${insertedQuestions.length} questions created`);

  // Map question text -> new UUID so we can link the mock in the right order.
  const idByText = new Map(insertedQuestions.map((r) => [r.text, r.id]));

  // 6. Mock — published to Batch A so the demo student sees + can take it.
  const { data: mock, error: mErr } = await supabase
    .from("mocks")
    .insert({
      centre_id: centre.id,
      batch_id: batch.id,
      title: MOCK_TITLE,
      status: "published",
    })
    .select("id")
    .single();
  if (mErr) throw mErr;
  console.log("  • mock created (published to batch)");

  // 7. Link the fixed 9 questions, preserving order.
  const mockRows = MOCK_QUESTION_IDS.map((seedId, position) => {
    const seedQ = QUESTION_BANK.find((q) => q.id === seedId);
    if (!seedQ) throw new Error(`Unknown mock question id: ${seedId}`);
    const questionId = idByText.get(seedQ.text);
    if (!questionId) throw new Error(`Question not inserted: ${seedId}`);
    return { mock_id: mock.id, question_id: questionId, position };
  });
  const { error: mqErr } = await supabase
    .from("mock_questions")
    .insert(mockRows);
  if (mqErr) throw mqErr;
  console.log(`  • ${mockRows.length} mock questions linked`);

  // 8. Auth users + profiles for the three demo roles (from SEED_* env vars).
  const admin = seedCreds("ADMIN");
  const teacher = seedCreds("TEACHER");
  const studentCreds = seedCreds("STUDENT");
  const loginLines: string[] = [];

  if (admin) {
    const id = await upsertAuthUser(admin.email, admin.password, "Platform Admin");
    // Admin is platform-level — NOT tied to any specific centre (centre_id = NULL).
    const { error: pErr } = await supabase.from("profiles").upsert({
      id,
      role: "admin",
      centre_id: null,
      full_name: "Platform Admin",
    });
    if (pErr) throw pErr;
    loginLines.push(`  admin    ${admin.email}  /  ${admin.password}`);
    console.log("  • admin account ready (platform-level, no centre)");
  }

  if (teacher) {
    const id = await upsertAuthUser(teacher.email, teacher.password, "Demo Teacher");
    // Teacher is the centre manager — centre_id points to their centre.
    await upsertProfile(id, "teacher", centre.id, "Demo Teacher");
    // Assign this teacher as the owner of the batch.
    await supabase.from("batches").update({ teacher_id: id }).eq("id", batch.id);
    loginLines.push(`  teacher  ${teacher.email}  /  ${teacher.password}`);
    console.log("  • teacher account ready (centre manager)");
  }

  if (studentCreds) {
    const id = await upsertAuthUser(
      studentCreds.email,
      studentCreds.password,
      "Aarav Menon",
    );
    await upsertProfile(id, "student", centre.id, "Aarav Menon");
    // Link the existing "Aarav Menon" student row to this login.
    const aarav = insertedStudents.find((s) => s.name === "Aarav Menon");
    if (aarav) {
      await supabase
        .from("students")
        .update({ profile_id: id })
        .eq("id", aarav.id);
    }
    loginLines.push(`  student  ${studentCreds.email}  /  ${studentCreds.password}`);
    console.log("  • student account ready (linked to Aarav Menon)");
  }

  if (loginLines.length === 0) {
    console.log(
      "  • (no SEED_*_EMAIL/PASSWORD env vars set — skipped auth accounts)",
    );
  }

  console.log("\n✓ Seed complete.");
  console.log(`  Mock:    ${MOCK_TITLE} (${mock.id})`);
  console.log(`  Students under: ${BATCH_NAME}`);
  if (loginLines.length > 0) {
    console.log("\n  Demo logins:");
    loginLines.forEach((l) => console.log(l));
  }
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message ?? err);
  process.exit(1);
});
