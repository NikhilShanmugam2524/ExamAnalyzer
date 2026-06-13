/**
 * Teacher dashboard — centre management + class insights command centre.
 *
 * The teacher is the coaching centre's manager (the B2B buyer). Beyond managing
 * questions, mocks and students, this surfaces the class-level view of the skill
 * data DriveScore collects: headline stats, the "re-teach this week" weak-chapter
 * list, a class leaderboard, and a per-student roster with level + activity.
 * All scoped to the teacher's own centre/batches by RLS.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Dumbbell,
  FileStack,
  Flame,
  Library,
  Stethoscope,
  TrendingDown,
  Trophy,
  Users2,
} from "lucide-react";
import { getCurrentUser, landingFor } from "@/lib/auth";
import { getTeacherClassInsights } from "@/lib/db/teacher";
import { CreateStudentForm } from "@/components/admin/CreateStudentForm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/brand/Logo";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import type { Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVEL_TEXT: Record<string, string> = {
  Aspirant: "text-paper/70",
  Achiever: "text-energy",
  Scholar: "text-energy",
  Ranker: "text-reward",
  Topper: "text-reward",
  "White Coat": "text-[#B7AEFF]",
};
const SUBJECT_COLOR: Record<Subject, string> = {
  Physics: "#5EC8FF",
  Chemistry: "#FFC454",
  Biology: "#00E0B8",
};
const SUBJECT_ABBR: Record<Subject, string> = {
  Physics: "Phy",
  Chemistry: "Chem",
  Biology: "Bio",
};

const fmt = (n: number) => n.toLocaleString("en-IN");
const barPct = (rating: number) =>
  Math.max(4, Math.min(100, Math.round(((rating - 700) / 800) * 100)));

function relTime(ms: number | null): string {
  if (ms === null) return "never";
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[11px] text-paper/30">—</span>;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${
        up ? "text-energy" : "text-[#FF9A91]"
      }`}
    >
      <ArrowUpRight className={`h-3 w-3 ${up ? "" : "rotate-90"}`} />
      {up ? "+" : ""}
      {fmt(delta)}
    </span>
  );
}

export default async function TeacherPage() {
  const me = await getCurrentUser();

  // Not logged in — show the teacher login form at this private URL.
  if (!me) {
    return (
      <main className="landing-skin relative flex min-h-dvh flex-col items-center justify-center bg-[#06140f] px-5 py-10">
        <AuroraBackground />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8">
            <Logo size={44} wordmarkClassName="text-2xl text-paper" />
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-energy">
              <Stethoscope className="h-3.5 w-3.5" /> Centre Manager · sign in
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm">
            <LoginForm embedded theme="dark" />
          </div>
        </div>
      </main>
    );
  }

  if (me.profile.role !== "teacher") {
    redirect(landingFor(me.profile.role));
  }

  const centreId = me.profile.centreId;
  const insights = centreId
    ? await getTeacherClassInsights(centreId)
    : { students: [], leaderboard: [], weakChapters: [], stats: { totalStudents: 0, withLogins: 0, activeThisWeek: 0, ratedStudents: 0, avgRating: null, attemptsThisWeek: 0 } };
  const { students, leaderboard, weakChapters, stats } = insights;

  const statCards = [
    { label: "Students", value: fmt(stats.totalStudents), sub: `${stats.withLogins} with login` },
    { label: "Active this week", value: fmt(stats.activeThisWeek), sub: `of ${stats.totalStudents}` },
    { label: "Class average", value: stats.avgRating !== null ? fmt(stats.avgRating) : "—", sub: "overall rating" },
    { label: "Tests this week", value: fmt(stats.attemptsThisWeek), sub: "submitted" },
  ];

  return (
    <main className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-12 pt-6">
        <header className="animate-fade-up flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo wordmark={false} size={40} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                Centre Manager
              </p>
              <h1 className="font-display text-lg font-bold text-paper">
                {me.profile.fullName ?? "Teacher"}
              </h1>
            </div>
          </div>
          <LogoutButton dark />
        </header>

        {/* Headline stats */}
        <section className="animate-fade-up mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((c) => (
            <div key={c.label} className="card-glass p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/45">
                {c.label}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-paper">
                {c.value}
              </p>
              <p className="text-[11px] text-paper/45">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Quick links */}
        <section className="animate-fade-up mt-3 grid gap-3 sm:grid-cols-3">
          <Link href="/teacher/questions" className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <Library className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-paper">Questions</p>
              <p className="truncate text-xs text-paper/55">Add &amp; manage</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-paper/30" />
          </Link>
          <Link href="/teacher/mocks" className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <FileStack className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-paper">Mocks</p>
              <p className="truncate text-xs text-paper/55">Build &amp; publish</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-paper/30" />
          </Link>
          <Link href="/teacher/practice" className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-paper">Practice activity</p>
              <p className="truncate text-xs text-paper/55">Lesson tests &amp; mocks</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-paper/30" />
          </Link>
        </section>

        {/* Insights: re-teach + leaderboard */}
        <section className="animate-fade-up mt-6 grid gap-4 lg:grid-cols-2">
          {/* Re-teach this week */}
          <div className="card-glass min-w-0 p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF9A91]">
              <TrendingDown className="h-4 w-4" /> Re-teach this week
            </h2>
            {weakChapters.length === 0 ? (
              <p className="py-6 text-center text-sm text-paper/50">
                Once your students practise, the chapters the class is weakest in
                will surface here — your re-teach shortlist.
              </p>
            ) : (
              <div className="grid gap-3">
                {weakChapters.map((c) => (
                  <div key={`${c.subject}-${c.chapter}`} className="min-w-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate font-medium text-paper/90">
                        <span className="mr-1.5 text-[10px] font-bold uppercase" style={{ color: SUBJECT_COLOR[c.subject] }}>
                          {SUBJECT_ABBR[c.subject]}
                        </span>
                        {c.chapter}
                      </span>
                      <span className="shrink-0 tabular-nums text-paper/55">
                        avg {fmt(c.avgRating)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${barPct(c.avgRating)}%`, background: SUBJECT_COLOR[c.subject] }} />
                      </div>
                      {c.strugglingCount > 0 && (
                        <span className="shrink-0 text-[10px] font-semibold text-[#FF9A91]">
                          {c.strugglingCount} struggling
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="card-glass min-w-0 p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-reward">
              <Trophy className="h-4 w-4" /> Class leaderboard
            </h2>
            {leaderboard.length === 0 ? (
              <p className="py-6 text-center text-sm text-paper/50">
                No ratings yet — the leaderboard fills in as students take tests.
              </p>
            ) : (
              <div className="grid gap-1.5">
                {leaderboard.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 odd:bg-white/[0.03]">
                    <span className={`w-5 shrink-0 text-center font-display text-sm font-extrabold tabular-nums ${i === 0 ? "text-reward" : i < 3 ? "text-paper/80" : "text-paper/40"}`}>
                      {i + 1}
                    </span>
                    <Link href={`/teacher/students/${s.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-paper hover:text-energy">{s.name}</p>
                      {s.level && <p className="truncate text-[11px] text-paper/45">{s.level}</p>}
                    </Link>
                    <DeltaBadge delta={s.weeklyDelta} />
                    <span className={`shrink-0 font-display text-sm font-extrabold tabular-nums ${LEVEL_TEXT[s.level ?? ""] ?? "text-paper"}`}>
                      {s.rating !== null ? fmt(s.rating) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Add student */}
        <section className="animate-fade-up mt-6">
          <CreateStudentForm />
        </section>

        {/* Students roster */}
        <section className="animate-fade-up mt-6">
          <div className="mb-2.5 flex items-center gap-2">
            <Users2 className="h-4 w-4 text-energy" />
            <h2 className="font-display text-lg font-bold text-paper">
              Students ({students.length})
            </h2>
          </div>

          {students.length === 0 ? (
            <div className="card-glass p-5 text-sm text-paper/60">
              No students yet — add one above.
            </div>
          ) : (
            <div className="card-glass divide-y divide-white/[0.06]">
              {students.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/teacher/students/${s.id}`}
                      className="block truncate font-medium text-paper hover:text-energy hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="text-xs text-paper/50">
                      {s.attempts} {s.attempts === 1 ? "test" : "tests"} · active {relTime(s.lastActive)}
                    </p>
                  </div>

                  {s.level && s.rating !== null ? (
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <span className={`text-xs font-bold ${LEVEL_TEXT[s.level] ?? "text-paper"}`}>{s.level}</span>
                      <span className="tabular-nums text-xs text-paper/55">{fmt(s.rating)}</span>
                      <DeltaBadge delta={s.weeklyDelta} />
                    </div>
                  ) : (
                    <span className="hidden shrink-0 text-xs text-paper/35 sm:block">unrated</span>
                  )}

                  <div className="flex shrink-0 items-center gap-2">
                    {!s.hasLogin && (
                      <span className="pill bg-white/10 text-paper/60">No login</span>
                    )}
                    {s.latestAttemptId && (
                      <Link
                        href={`/report?attempt=${s.latestAttemptId}`}
                        className="text-xs font-semibold text-energy hover:underline"
                      >
                        Report
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Engagement nudge */}
        {stats.totalStudents > 0 && stats.activeThisWeek < stats.totalStudents && (
          <section className="animate-fade-up mt-4">
            <div className="card-glass flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent2/20 text-[#B7AEFF]">
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-paper">
                  {stats.totalStudents - stats.activeThisWeek} student
                  {stats.totalStudents - stats.activeThisWeek === 1 ? "" : "s"} inactive this week
                </p>
                <p className="text-xs text-paper/55">
                  Publish a mock or nudge them to practise to keep ratings moving.
                </p>
              </div>
              <Activity className="h-5 w-5 shrink-0 text-paper/25" />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
