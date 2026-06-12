/**
 * Platform Super-Admin Dashboard.
 *
 * Admin = the SynapTest platform owner. No centre_id. Cross-centre god-mode:
 * sees all centres, can create new centres and their teacher accounts.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronRight, Database, Plus, Shield, Users } from "lucide-react";
import { getCurrentUser, landingFor } from "@/lib/auth";
import { listAllCentres } from "@/lib/db/admin";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuroraBackground } from "@/components/landing/AuroraBackground";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentUser();

  // Not logged in — show the admin login form at this private URL.
  if (!me) {
    return (
      <main className="landing-skin relative flex min-h-dvh flex-col items-center justify-center bg-[#06140f] px-5 py-10">
        <AuroraBackground />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-paper shadow-[0_0_20px_-4px_rgba(255,255,255,0.15)] ring-1 ring-white/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-paper">
                SynapTest Admin
              </h1>
              <p className="text-xs font-medium text-paper/50">Restricted access</p>
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

  let centres: Awaited<ReturnType<typeof listAllCentres>> = [];
  try {
    centres = await listAllCentres();
  } catch {
    centres = [];
  }

  const totalStudents = centres.reduce((s, c) => s + c.studentCount, 0);
  const totalQuestions = centres.reduce((s, c) => s + c.questionCount, 0);

  return (
    <main className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-10 pt-6">
        <header className="animate-fade-up flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-paper ring-1 ring-white/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                SynapTest Platform
              </p>
              <h1 className="font-display text-lg font-bold text-paper">Super Admin</h1>
            </div>
          </div>
          <LogoutButton dark />
        </header>

        {/* Platform stats */}
        <section className="animate-fade-up mt-6 grid grid-cols-3 gap-3">
          <StatCard label="Centres" value={centres.length} />
          <StatCard label="Students" value={totalStudents} />
          <StatCard label="Questions" value={totalQuestions} />
        </section>

        {/* Actions */}
        <section className="animate-fade-up mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/admin/centres/new"
            className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-paper">New centre</p>
              <p className="text-xs text-paper/55">Create coaching centre</p>
            </div>
          </Link>

          <Link
            href="/admin/teachers/new"
            className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent2/20 text-[#B7AEFF]">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-paper">New teacher</p>
              <p className="text-xs text-paper/55">Create centre manager</p>
            </div>
          </Link>
        </section>

        {/* Global question bank — powers student self-practice */}
        <section className="animate-fade-up mt-3">
          <Link
            href="/admin/bank"
            className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-paper">Global question bank</p>
              <p className="text-xs text-paper/55">
                SynapTest pool for student lesson practice &amp; full mocks
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-paper/30" />
          </Link>
        </section>

        {/* Centres list */}
        <section className="animate-fade-up mt-6">
          <div className="mb-2.5 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-paper/50" />
            <h2 className="font-display text-lg font-bold text-paper">
              All centres ({centres.length})
            </h2>
          </div>

          {centres.length === 0 ? (
            <div className="card-glass p-5 text-sm text-paper/60">
              No centres yet —{" "}
              <Link href="/admin/centres/new" className="font-semibold text-energy hover:underline">
                create the first one
              </Link>
              .
            </div>
          ) : (
            <div className="card-glass divide-y divide-white/[0.06]">
              {centres.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/centres/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-paper">{c.name}</p>
                    <p className="text-xs text-paper/50">
                      {c.studentCount} students · {c.questionCount} questions · {c.mockCount} mocks
                      {c.teacherEmail && (
                        <> · <span className="text-energy">{c.teacherEmail}</span></>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-paper/30" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-glass p-4 text-center">
      <p className="font-display text-2xl font-bold tabular-nums text-paper">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-paper/50">{label}</p>
    </div>
  );
}
