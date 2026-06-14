/**
 * Platform Super-Admin Dashboard — cross-centre operations & analytics.
 *
 * Admin = the DriveScore platform owner. No centre_id. This is the owner's
 * read-only ops console: platform KPIs, the Centre Health "churn radar", teacher
 * adoption + student activation signals, weekly momentum, and the platform-wide
 * diagnosis-category mix. The existing management features (create centre /
 * teacher, view a centre, global bank) stay linked from here.
 *
 * All metrics derive from existing data only (see lib/db/adminAnalytics.ts).
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Building2,
  Database,
  KeyRound,
  Plus,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { getCurrentUser, landingFor } from "@/lib/auth";
import {
  getCentreHealth,
  getDiagnosisBreakdown,
  getPlatformKpis,
  getTrends,
  type CentreHealthRow,
  type DiagnosisBreakdown,
  type WeeklyPoint,
} from "@/lib/db/adminAnalytics";
import type { DiagnosisCategory } from "@/lib/types";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuroraBackground } from "@/components/landing/AuroraBackground";
import { Logo } from "@/components/brand/Logo";
import { CentreHealthTable } from "@/components/admin/CentreHealthTable";

export const dynamic = "force-dynamic";

/** Inline hex per diagnosis bucket (Tailwind can't do dynamic class names). */
const DIAG_COLOR: Record<DiagnosisCategory, string> = {
  CONCEPT_GAP: "#e11d48",
  GUESS: "#f97316",
  CARELESS: "#f59e0b",
  TOO_SLOW: "#6366f1",
  TIME_MANAGEMENT: "#64748b",
  SOLID: "#10b981",
};

export default async function AdminPage() {
  const me = await getCurrentUser();

  // Not logged in — show the admin login form at this private URL.
  if (!me) {
    return (
      <main className="landing-skin relative flex min-h-dvh flex-col items-center justify-center bg-[#06140f] px-5 py-10">
        <AuroraBackground />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8">
            <Logo size={44} wordmarkClassName="text-2xl text-paper" />
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-paper/50">
              <Shield className="h-3.5 w-3.5" /> Admin · restricted access
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm">
            <LoginForm embedded theme="dark" />
          </div>
        </div>
      </main>
    );
  }

  // Wrong role — send them to their own landing page.
  if (me.profile.role !== "admin") {
    redirect(landingFor(me.profile.role));
  }

  // Load analytics. Health first (the KPIs roll up from it), then the rest in
  // parallel. Degrade gracefully so a data hiccup never white-screens /admin.
  let health: CentreHealthRow[] = [];
  try {
    health = await getCentreHealth();
  } catch {
    health = [];
  }

  const [kpis, trends, diagnosis] = await Promise.all([
    getPlatformKpis(health).catch(() => null),
    getTrends(12).catch(() => null),
    getDiagnosisBreakdown(200).catch(() => null),
  ]);

  const activationPct =
    kpis && kpis.totalStudents > 0
      ? Math.round((kpis.activatedStudents / kpis.totalStudents) * 100)
      : 0;
  const loginPct =
    kpis && kpis.totalStudents > 0
      ? Math.round((kpis.studentsWithLogin / kpis.totalStudents) * 100)
      : 0;
  const stalled = health.filter((c) => c.stalledOnboarding);

  return (
    <main className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-14 pt-6">
        <header className="animate-fade-up flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo wordmark={false} size={40} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                DriveScore Platform
              </p>
              <h1 className="font-display text-lg font-bold text-paper">Operations dashboard</h1>
            </div>
          </div>
          <LogoutButton dark />
        </header>

        {/* 1 — Platform KPI cards */}
        <section className="animate-fade-up mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi
            label="Centres"
            value={kpis?.totalCentres ?? health.length}
            sub={kpis && kpis.newCentresThisMonth > 0 ? `+${kpis.newCentresThisMonth} this month` : "all time"}
          />
          <Kpi
            label="Active centres"
            value={kpis?.activeCentres ?? 0}
            sub="attempt in last 7d"
            accent
          />
          <Kpi
            label="Students"
            value={kpis?.totalStudents ?? 0}
            sub={kpis ? `${kpis.studentsWithLogin} with login` : ""}
          />
          <Kpi
            label="Mocks taken"
            value={kpis?.totalAttempts ?? 0}
            sub={kpis ? `${kpis.attemptsThisWeek} this week` : ""}
          />
          <Kpi
            label="Questions"
            value={kpis?.totalQuestions ?? 0}
            sub="across centre banks"
          />
        </section>

        {/* Management actions (existing features) */}
        <section className="animate-fade-up mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ActionCard
            href="/admin/centres/new"
            icon={<Plus className="h-5 w-5" />}
            title="New centre"
            sub="Create coaching centre"
          />
          <ActionCard
            href="/admin/teachers/new"
            icon={<Users className="h-5 w-5" />}
            title="New teacher"
            sub="Create centre manager"
            tone="violet"
          />
          <ActionCard
            href="/admin/bank"
            icon={<Database className="h-5 w-5" />}
            title="Global question bank"
            sub="Powers student practice"
          />
        </section>

        {/* 2 — Centre Health: the churn radar */}
        <section className="animate-fade-up mt-8">
          <SectionHeading
            icon={<Building2 className="h-4 w-4" />}
            title={`Centre health (${health.length})`}
            hint="🟢 active ≤7d · 🟡 quiet 8–30d · 🔴 dormant 30d+"
          />
          {stalled.length > 0 && (
            <p className="mb-2.5 text-xs text-amber-300/90">
              {stalled.length} centre{stalled.length > 1 ? "s have" : " has"} students but no
              published mock yet — prime onboarding intervention.
            </p>
          )}
          <CentreHealthTable rows={health} />
        </section>

        {/* 4 — Activity trends */}
        <section className="animate-fade-up mt-8 grid gap-4 lg:grid-cols-2">
          <div className="card-glass p-5">
            <SectionHeading
              icon={<Activity className="h-4 w-4" />}
              title="Attempts per week"
              hint="last 12 weeks"
            />
            <WeeklyBars points={trends?.attemptsPerWeek ?? []} color="#00E0B8" />
          </div>
          <div className="card-glass p-5">
            <SectionHeading
              icon={<TrendingUp className="h-4 w-4" />}
              title="New students per week"
              hint="last 12 weeks"
            />
            <WeeklyBars points={trends?.newStudentsPerWeek ?? []} color="#6C5CE7" />
          </div>
        </section>

        {/* 5 — Student activation + 6 — Diagnosis insights */}
        <section className="animate-fade-up mt-4 grid gap-4 lg:grid-cols-2">
          <div className="card-glass p-5">
            <SectionHeading
              icon={<Users className="h-4 w-4" />}
              title="Student activation"
              hint="took ≥1 mock"
            />
            <div className="mt-1 flex items-end gap-2">
              <span className="font-display text-4xl font-bold tabular-nums text-paper">
                {activationPct}%
              </span>
              <span className="mb-1 text-xs text-paper/55">
                {kpis?.activatedStudents ?? 0} of {kpis?.totalStudents ?? 0} students active
              </span>
            </div>
            <Meter pct={activationPct} color="#00E0B8" />
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-2xl font-bold tabular-nums text-paper/90">
                {loginPct}%
              </span>
              <span className="mb-1 text-xs text-paper/55">
                have a login set up ({kpis?.studentsWithLogin ?? 0})
              </span>
            </div>
            <Meter pct={loginPct} color="#6C5CE7" />
          </div>

          <div className="card-glass p-5">
            <SectionHeading
              icon={<Shield className="h-4 w-4" />}
              title="Diagnosis mix"
              hint={diagnosis ? `recent ${diagnosis.sampleAttempts} attempts` : "recent attempts"}
            />
            <DiagnosisBars data={diagnosis} />
            {diagnosis && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-paper/65">
                <span>
                  Avg accuracy:{" "}
                  <span className="font-semibold text-paper">{diagnosis.avgAccuracyPct}%</span>
                </span>
                {diagnosis.weakestSubject && (
                  <span>
                    Weakest subject:{" "}
                    <span className="font-semibold text-pop">{diagnosis.weakestSubject}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Join codes reference (kept from the previous admin list) */}
        {health.length > 0 && (
          <section className="animate-fade-up mt-8">
            <details className="card-glass group p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-paper/80">
                <KeyRound className="h-4 w-4 text-paper/50" />
                Teacher join codes
                <span className="ml-auto text-xs font-normal text-paper/40 group-open:hidden">
                  show
                </span>
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {health.map((c) => (
                  <div
                    key={c.centreId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
                  >
                    <span className="truncate text-sm text-paper/80">{c.name}</span>
                    <span className="shrink-0 font-mono text-sm font-bold tracking-widest text-energy">
                      {c.joinCode ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}

// ── Presentational helpers (server-rendered, SSR-safe) ──────────────────────

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card-glass p-4">
      <p
        className={`font-display text-2xl font-bold tabular-nums ${
          accent ? "text-energy" : "text-paper"
        }`}
      >
        {value.toLocaleString("en-IN")}
      </p>
      <p className="mt-0.5 text-xs font-medium text-paper/55">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-paper/35">{sub}</p>}
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  sub,
  tone = "energy",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone?: "energy" | "violet";
}) {
  const iconCls =
    tone === "violet" ? "bg-accent2/20 text-[#B7AEFF]" : "bg-energy/15 text-energy";
  return (
    <Link
      href={href}
      className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
    >
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconCls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-display font-semibold text-paper">{title}</p>
        <p className="text-xs text-paper/55">{sub}</p>
      </div>
    </Link>
  );
}

function SectionHeading({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="text-paper/50">{icon}</span>
      <h2 className="font-display text-base font-bold text-paper">{title}</h2>
      {hint && <span className="ml-auto text-[11px] text-paper/40">{hint}</span>}
    </div>
  );
}

function WeeklyBars({ points, color }: { points: WeeklyPoint[]; color: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  if (points.length === 0) {
    return <p className="py-6 text-center text-xs text-paper/40">No data yet.</p>;
  }
  return (
    <div>
      <div className="flex h-28 items-end gap-1">
        {points.map((p) => {
          const h = Math.round((p.value / max) * 100);
          const label = new Date(p.weekStart).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });
          return (
            <div key={p.weekStart} className="group relative flex flex-1 items-end">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(h, p.value > 0 ? 6 : 2)}%`,
                  backgroundColor: p.value > 0 ? color : "rgba(255,255,255,0.07)",
                }}
                title={`Week of ${label}: ${p.value}`}
              />
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-paper opacity-0 transition group-hover:opacity-100">
                {p.value}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-paper/35">
        <span>
          {points[0] &&
            new Date(points[0].weekStart).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
        </span>
        <span>
          {points[points.length - 1] &&
            new Date(points[points.length - 1].weekStart).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
        </span>
      </div>
    </div>
  );
}

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function DiagnosisBars({ data }: { data: DiagnosisBreakdown | null }) {
  if (!data || data.sampleAnswers === 0) {
    return <p className="py-6 text-center text-xs text-paper/40">No graded answers yet.</p>;
  }
  return (
    <div className="space-y-2">
      {/* Stacked share bar */}
      <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
        {data.categories
          .filter((c) => c.count > 0)
          .map((c) => (
            <div
              key={c.category}
              style={{ width: `${c.pct}%`, backgroundColor: DIAG_COLOR[c.category] }}
              title={`${c.title}: ${c.pct}%`}
            />
          ))}
      </div>
      {/* Legend rows */}
      <div className="mt-2 space-y-1.5">
        {data.categories.map((c) => (
          <div key={c.category} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: DIAG_COLOR[c.category] }}
            />
            <span className="text-paper/70">{c.title}</span>
            <span className="ml-auto tabular-nums text-paper/50">
              {c.pct}% <span className="text-paper/30">({c.count})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
