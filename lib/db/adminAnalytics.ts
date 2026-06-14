import "server-only";

/**
 * Platform-admin analytics — the read-only operations dashboard behind /admin.
 *
 * Every metric is derived from EXISTING tables (centres, profiles, students,
 * questions, mocks, attempts, answers). No new data is collected. All reads use
 * the SERVICE key (the admin role is cross-centre and has no centre_id to scope
 * by), and this module is only ever imported by the admin page — never by
 * client code (`server-only` enforces that at build time).
 *
 * Heavy per-centre rollups + weekly trends come from the SQL views added in
 * migration 0014 (admin_centre_health, admin_weekly_attempts,
 * admin_weekly_students). If that migration hasn't been applied yet, each
 * reader falls back to an equivalent JS aggregation, so the dashboard works
 * either way (just less efficiently until the views exist).
 *
 * The diagnosis-category breakdown is ALWAYS computed in JS via lib/diagnose.ts
 * (the category is never stored — single source of truth) and is bounded to a
 * window of recent attempts to stay fast.
 */

import { getServiceClient } from "./client";
import { diagnose, CATEGORY_META, PROBLEM_ORDER } from "@/lib/diagnose";
import type { DiagnosisCategory, Difficulty, Question, Subject } from "@/lib/types";

// Postgres "undefined_table" — thrown when a 0014 view doesn't exist yet.
const UNDEFINED_TABLE = "42P01";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

// ── Centre health (the churn radar) ─────────────────────────────────────────

export type CentreStatus = "active" | "quiet" | "dormant";

export type CentreHealthRow = {
  centreId: string;
  name: string;
  createdAt: string;
  joinCode: string | null;
  studentCount: number;
  studentsWithLogin: number;
  activeStudents: number; // took ≥1 mock
  questionCount: number;
  instituteMockCount: number; // mocks the teacher has built
  publishedMockCount: number;
  lastMockCreatedAt: string | null;
  attempts30d: number;
  attempts7d: number;
  lastActivity: string | null;
  lastActivityDays: number | null;
  status: CentreStatus;
  /** Onboarded (has students) but the teacher has published nothing yet. */
  stalledOnboarding: boolean;
};

/** Active ≤7d · Quiet 8–30d · Dormant >30d or never. */
export function centreStatus(lastActivity: string | null): CentreStatus {
  const d = daysAgo(lastActivity);
  if (d === null) return "dormant";
  if (d <= 7) return "active";
  if (d <= 30) return "quiet";
  return "dormant";
}

type CentreHealthBase = Omit<
  CentreHealthRow,
  "lastActivityDays" | "status" | "stalledOnboarding"
>;

function finalizeHealth(b: CentreHealthBase): CentreHealthRow {
  const status = centreStatus(b.lastActivity);
  return {
    ...b,
    lastActivityDays: daysAgo(b.lastActivity),
    status,
    stalledOnboarding: b.studentCount > 0 && b.publishedMockCount === 0,
  };
}

/** Read the per-centre rollup from the SQL view (preferred path). */
async function centreHealthFromView(): Promise<CentreHealthRow[] | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("admin_centre_health")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    if (error.code === UNDEFINED_TABLE) return null; // migration not applied
    throw error;
  }
  return (data ?? []).map((r) =>
    finalizeHealth({
      centreId: r.centre_id as string,
      name: r.name as string,
      createdAt: r.created_at as string,
      joinCode: (r.join_code as string | null) ?? null,
      studentCount: Number(r.student_count ?? 0),
      studentsWithLogin: Number(r.students_with_login ?? 0),
      activeStudents: Number(r.active_students ?? 0),
      questionCount: Number(r.question_count ?? 0),
      instituteMockCount: Number(r.institute_mock_count ?? 0),
      publishedMockCount: Number(r.published_mock_count ?? 0),
      lastMockCreatedAt: (r.last_mock_created_at as string | null) ?? null,
      attempts30d: Number(r.attempts_30d ?? 0),
      attempts7d: Number(r.attempts_7d ?? 0),
      lastActivity: (r.last_activity as string | null) ?? null,
    }),
  );
}

/** Equivalent aggregation in JS — used when the 0014 views aren't applied. */
async function centreHealthFromJs(): Promise<CentreHealthRow[]> {
  const supabase = getServiceClient();

  const [{ data: centres }, { data: students }, { data: questions }, { data: mocks }] =
    await Promise.all([
      supabase.from("centres").select("id, name, created_at, join_code").order("name"),
      supabase.from("students").select("id, centre_id, profile_id"),
      supabase.from("questions").select("centre_id").not("centre_id", "is", null),
      supabase
        .from("mocks")
        .select("centre_id, kind, status, created_at")
        .not("centre_id", "is", null),
    ]);

  // Submitted attempts → centre via the student's centre_id.
  const { data: attempts } = await supabase
    .from("attempts")
    .select("student_id, submitted_at")
    .not("submitted_at", "is", null);

  const studentCentre = new Map<string, string | null>();
  const perCentreStudents = new Map<string, { total: number; withLogin: number }>();
  for (const s of students ?? []) {
    studentCentre.set(s.id as string, (s.centre_id as string | null) ?? null);
    const cid = s.centre_id as string | null;
    if (!cid) continue;
    const cur = perCentreStudents.get(cid) ?? { total: 0, withLogin: 0 };
    cur.total += 1;
    if (s.profile_id) cur.withLogin += 1;
    perCentreStudents.set(cid, cur);
  }

  const qCount = new Map<string, number>();
  for (const q of questions ?? []) {
    const cid = q.centre_id as string;
    qCount.set(cid, (qCount.get(cid) ?? 0) + 1);
  }

  const mockAgg = new Map<
    string,
    { institute: number; published: number; lastCreated: string | null }
  >();
  for (const m of mocks ?? []) {
    if (m.kind !== "institute") continue;
    const cid = m.centre_id as string;
    const cur = mockAgg.get(cid) ?? { institute: 0, published: 0, lastCreated: null };
    cur.institute += 1;
    if (m.status === "published") cur.published += 1;
    const created = m.created_at as string | null;
    if (created && (!cur.lastCreated || created > cur.lastCreated)) cur.lastCreated = created;
    mockAgg.set(cid, cur);
  }

  const now = Date.now();
  const actAgg = new Map<
    string,
    { active: Set<string>; a30: number; a7: number; last: string | null }
  >();
  for (const a of attempts ?? []) {
    const cid = studentCentre.get(a.student_id as string);
    if (!cid) continue;
    const cur = actAgg.get(cid) ?? { active: new Set<string>(), a30: 0, a7: 0, last: null };
    cur.active.add(a.student_id as string);
    const sub = a.submitted_at as string;
    const ageDays = (now - new Date(sub).getTime()) / DAY;
    if (ageDays <= 30) cur.a30 += 1;
    if (ageDays <= 7) cur.a7 += 1;
    if (!cur.last || sub > cur.last) cur.last = sub;
    actAgg.set(cid, cur);
  }

  return (centres ?? []).map((c) => {
    const cid = c.id as string;
    const st = perCentreStudents.get(cid) ?? { total: 0, withLogin: 0 };
    const mk = mockAgg.get(cid) ?? { institute: 0, published: 0, lastCreated: null };
    const ac = actAgg.get(cid);
    return finalizeHealth({
      centreId: cid,
      name: c.name as string,
      createdAt: c.created_at as string,
      joinCode: (c.join_code as string | null) ?? null,
      studentCount: st.total,
      studentsWithLogin: st.withLogin,
      activeStudents: ac ? ac.active.size : 0,
      questionCount: qCount.get(cid) ?? 0,
      instituteMockCount: mk.institute,
      publishedMockCount: mk.published,
      lastMockCreatedAt: mk.lastCreated,
      attempts30d: ac ? ac.a30 : 0,
      attempts7d: ac ? ac.a7 : 0,
      lastActivity: ac ? ac.last : null,
    });
  });
}

export async function getCentreHealth(): Promise<CentreHealthRow[]> {
  return (await centreHealthFromView()) ?? centreHealthFromJs();
}

// ── Platform KPIs ───────────────────────────────────────────────────────────

export type PlatformKpis = {
  totalCentres: number;
  newCentresThisMonth: number;
  activeCentres: number; // attempt in last 7 days
  totalStudents: number;
  studentsWithLogin: number;
  activatedStudents: number; // took ≥1 mock
  totalAttempts: number; // all-time, submitted
  attemptsThisWeek: number;
  totalQuestions: number; // across centre banks (centre_id not null)
};

/**
 * Roll the centre-health rows (already fetched) up into the headline KPIs, plus
 * a couple of cheap platform-wide counts the per-centre view doesn't carry.
 */
export async function getPlatformKpis(health: CentreHealthRow[]): Promise<PlatformKpis> {
  const supabase = getServiceClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();

  const [{ count: totalAttempts }, { count: attemptsThisWeek }] = await Promise.all([
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .not("submitted_at", "is", null)
      .then((r) => ({ count: r.count ?? 0 })),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .not("submitted_at", "is", null)
      .gte("submitted_at", weekAgo)
      .then((r) => ({ count: r.count ?? 0 })),
  ]);

  return {
    totalCentres: health.length,
    newCentresThisMonth: health.filter(
      (c) => new Date(c.createdAt) >= startOfMonth,
    ).length,
    activeCentres: health.filter((c) => c.status === "active").length,
    totalStudents: health.reduce((s, c) => s + c.studentCount, 0),
    studentsWithLogin: health.reduce((s, c) => s + c.studentsWithLogin, 0),
    activatedStudents: health.reduce((s, c) => s + c.activeStudents, 0),
    totalAttempts,
    attemptsThisWeek,
    totalQuestions: health.reduce((s, c) => s + c.questionCount, 0),
  };
}

// ── Weekly trends ─────────────────────────────────────────────────────────

export type WeeklyPoint = { weekStart: string; value: number };

/** Bucket ISO-week-start (Mon) → value into a dense last-`weeks`-weeks array. */
function densifyWeeks(
  raw: { weekStart: string; value: number }[],
  weeks: number,
): WeeklyPoint[] {
  // Monday of the current ISO week, at local midnight.
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  const dow = (monday.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(monday.getDate() - dow);

  const byKey = new Map<string, number>();
  for (const r of raw) {
    const k = new Date(r.weekStart);
    k.setHours(0, 0, 0, 0);
    byKey.set(k.toISOString().slice(0, 10), r.value);
  }

  const out: WeeklyPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setDate(monday.getDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    out.push({ weekStart: key, value: byKey.get(key) ?? 0 });
  }
  return out;
}

async function weeklyFromView(
  view: "admin_weekly_attempts" | "admin_weekly_students",
  valueCol: "attempts" | "new_students",
): Promise<{ weekStart: string; value: number }[] | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from(view).select("*");
  if (error) {
    if (error.code === UNDEFINED_TABLE) return null;
    throw error;
  }
  return (data ?? []).map((r) => ({
    weekStart: r.week_start as string,
    value: Number(r[valueCol] ?? 0),
  }));
}

async function weeklyFromJs(
  table: "attempts" | "students",
  dateCol: "submitted_at" | "created_at",
  weeks: number,
): Promise<{ weekStart: string; value: number }[]> {
  const supabase = getServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  let q = supabase.from(table).select(dateCol).gte(dateCol, since.toISOString());
  if (dateCol === "submitted_at") q = q.not("submitted_at", "is", null);
  const { data } = await q;

  const byKey = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, string | null>[]) {
    const v = row[dateCol];
    if (!v) continue;
    const d = new Date(v);
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow); // back to Monday
    const k = d.toISOString().slice(0, 10);
    byKey.set(k, (byKey.get(k) ?? 0) + 1);
  }
  return [...byKey.entries()].map(([weekStart, value]) => ({ weekStart, value }));
}

export type Trends = {
  attemptsPerWeek: WeeklyPoint[];
  newStudentsPerWeek: WeeklyPoint[];
};

export async function getTrends(weeks = 12): Promise<Trends> {
  const [attemptsRaw, studentsRaw] = await Promise.all([
    weeklyFromView("admin_weekly_attempts", "attempts").then(
      (v) => v ?? weeklyFromJs("attempts", "submitted_at", weeks),
    ),
    weeklyFromView("admin_weekly_students", "new_students").then(
      (v) => v ?? weeklyFromJs("students", "created_at", weeks),
    ),
  ]);
  return {
    attemptsPerWeek: densifyWeeks(attemptsRaw, weeks),
    newStudentsPerWeek: densifyWeeks(studentsRaw, weeks),
  };
}

// ── Diagnosis insights (bounded recompute via lib/diagnose.ts) ──────────────

export type DiagnosisBreakdown = {
  sampleAttempts: number;
  sampleAnswers: number;
  /** Problem categories (SOLID excluded), in display order, with share %. */
  categories: { category: DiagnosisCategory; title: string; count: number; pct: number }[];
  avgAccuracyPct: number;
  weakestSubject: Subject | null;
};

/**
 * Recompute the diagnosis-category mix across the most RECENT `limit` submitted
 * attempts (bounded for performance — we never recompute over all history). The
 * category is derived live by diagnose() from (question + picked answer + time).
 */
export async function getDiagnosisBreakdown(limit = 200): Promise<DiagnosisBreakdown> {
  const supabase = getServiceClient();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  const attemptIds = (attempts ?? []).map((a) => a.id as string);
  const empty: DiagnosisBreakdown = {
    sampleAttempts: 0,
    sampleAnswers: 0,
    categories: PROBLEM_ORDER.map((c) => ({
      category: c,
      title: CATEGORY_META[c].title,
      count: 0,
      pct: 0,
    })),
    avgAccuracyPct: 0,
    weakestSubject: null,
  };
  if (attemptIds.length === 0) return empty;

  const { data: answers } = await supabase
    .from("answers")
    .select("question_id, picked_index, time_sec")
    .in("attempt_id", attemptIds);
  if (!answers || answers.length === 0) return { ...empty, sampleAttempts: attemptIds.length };

  // Pull just the question fields diagnose() + accuracy need, deduped.
  const qIds = [...new Set(answers.map((a) => a.question_id as string))];
  const qMap = new Map<string, Question>();
  // Chunk the IN list to stay well under any URL/row limits.
  for (let i = 0; i < qIds.length; i += 500) {
    const chunk = qIds.slice(i, i + 500);
    const { data: qs } = await supabase
      .from("questions")
      .select("id, subject, difficulty, par_time_sec, answer_index")
      .in("id", chunk);
    for (const q of qs ?? []) {
      qMap.set(q.id as string, {
        id: q.id as string,
        subject: q.subject as Subject,
        chapter: "",
        concept: "",
        difficulty: q.difficulty as Difficulty,
        parTimeSec: q.par_time_sec as number,
        text: "",
        options: [],
        answerIndex: q.answer_index as number,
      });
    }
  }

  const counts = new Map<DiagnosisCategory, number>();
  let attempted = 0;
  let correct = 0;
  const bySubject = new Map<Subject, { attempted: number; correct: number }>();
  let scored = 0;

  for (const a of answers) {
    const q = qMap.get(a.question_id as string);
    if (!q) continue;
    scored += 1;
    const picked = (a.picked_index as number | null) ?? null;
    const cat = diagnose(q, picked, (a.time_sec as number) ?? 0);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);

    if (picked !== null) {
      attempted += 1;
      const isCorrect = picked === q.answerIndex;
      if (isCorrect) correct += 1;
      const s = bySubject.get(q.subject) ?? { attempted: 0, correct: 0 };
      s.attempted += 1;
      if (isCorrect) s.correct += 1;
      bySubject.set(q.subject, s);
    }
  }

  const problemTotal = PROBLEM_ORDER.reduce((sum, c) => sum + (counts.get(c) ?? 0), 0);
  const categories = PROBLEM_ORDER.map((c) => {
    const count = counts.get(c) ?? 0;
    return {
      category: c,
      title: CATEGORY_META[c].title,
      count,
      pct: problemTotal > 0 ? Math.round((count / problemTotal) * 100) : 0,
    };
  });

  let weakestSubject: Subject | null = null;
  let worst = Infinity;
  for (const [subject, s] of bySubject) {
    if (s.attempted < 5) continue; // ignore thin samples
    const acc = s.correct / s.attempted;
    if (acc < worst) {
      worst = acc;
      weakestSubject = subject;
    }
  }

  return {
    sampleAttempts: attemptIds.length,
    sampleAnswers: scored,
    categories,
    avgAccuracyPct: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    weakestSubject,
  };
}
