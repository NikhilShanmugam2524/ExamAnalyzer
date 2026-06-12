/**
 * Teacher dashboard — centre management command centre.
 *
 * The teacher is the coaching centre's manager: they own questions, mocks,
 * students, and batch reports — all scoped to their centre only.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Dumbbell,
  FileStack,
  GraduationCap,
  Library,
  Stethoscope,
  Users2,
} from "lucide-react";
import { getCurrentUser, landingFor } from "@/lib/auth";
import { listStudentsForCentre, listBatchesForCentre } from "@/lib/db/queries";
import { CreateStudentForm } from "@/components/admin/CreateStudentForm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuroraBackground } from "@/components/landing/AuroraBackground";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const me = await getCurrentUser();

  // Not logged in — show the teacher login form at this private URL.
  if (!me) {
    return (
      <main className="landing-skin relative flex min-h-dvh flex-col items-center justify-center bg-[#06140f] px-5 py-10">
        <AuroraBackground />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-deep text-white shadow-[0_0_20px_-4px_rgba(0,224,184,0.4)]">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-paper">
                Centre Manager
              </h1>
              <p className="text-xs font-medium text-energy">Sign in to your account</p>
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
  if (me.profile.role !== "teacher") {
    redirect(landingFor(me.profile.role));
  }

  const centreId = me.profile.centreId;

  const [batches, students] = centreId
    ? await Promise.all([
        listBatchesForCentre(centreId),
        listStudentsForCentre(centreId),
      ])
    : [[], []];

  return (
    <main className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-10 pt-6">
        <header className="animate-fade-up flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-deep text-white shadow-[0_0_18px_-4px_rgba(0,224,184,0.5)]">
              <Stethoscope className="h-5 w-5" />
            </div>
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

        {/* Quick links */}
        <section className="animate-fade-up mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/teacher/questions"
            className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <Library className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-paper">Questions</p>
              <p className="truncate text-xs text-paper/55">Add &amp; manage</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-paper/30" />
          </Link>

          <Link
            href="/teacher/mocks"
            className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <FileStack className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-paper">Mocks</p>
              <p className="truncate text-xs text-paper/55">Build &amp; publish</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-paper/30" />
          </Link>
        </section>

        {/* SynapTest practice activity */}
        <section className="animate-fade-up mt-3">
          <Link
            href="/teacher/practice"
            className="card-glass flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-paper">Practice activity</p>
              <p className="text-xs text-paper/55">
                Your students&apos; SynapTest lesson tests &amp; full mocks
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-paper/30" />
          </Link>
        </section>

        {/* Add student */}
        <section className="animate-fade-up mt-6">
          <CreateStudentForm batches={batches} />
        </section>

        {/* Students list */}
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
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-paper">{s.name}</p>
                    <p className="text-xs text-paper/50">{s.batchName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`pill ${
                        s.hasLogin
                          ? "bg-energy/15 text-energy"
                          : "bg-white/10 text-paper/60"
                      }`}
                    >
                      {s.hasLogin ? "Has login" : "No login"}
                    </span>
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

        {/* Batch reports shortcut */}
        {students.some((s) => s.latestAttemptId) && (
          <section className="animate-fade-up mt-4">
            <div className="card-glass flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent2/20 text-[#B7AEFF]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-paper">Batch reports</p>
                <p className="text-xs text-paper/55">
                  Click any student&apos;s &quot;Report&quot; link above to view their diagnosis.
                </p>
              </div>
              <BookOpen className="h-5 w-5 shrink-0 text-paper/25" />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
