/**
 * Teacher — Practice activity (Stage 4).
 *
 * Shows recent DriveScore self-practice attempts (lesson tests + full mocks) by
 * the centre's students, with score + a link to each diagnosis report. Data
 * access is granted by the attempts/answers teacher RLS; the practice mocks have
 * centre_id NULL so the data layer reads via the service client and scopes to
 * the centre's own students.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Dumbbell, Shuffle, BookOpen, LineChart } from "lucide-react";
import { getCurrentUser, landingFor } from "@/lib/auth";
import { listPracticeActivityForCentre } from "@/lib/db/practice";
import { AuroraBackground } from "@/components/landing/AuroraBackground";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default async function TeacherPracticePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/teacher");
  if (me.profile.role !== "teacher") redirect(landingFor(me.profile.role));

  const centreId = me.profile.centreId;
  let activity: Awaited<ReturnType<typeof listPracticeActivityForCentre>> = [];
  if (centreId) {
    try {
      activity = await listPracticeActivityForCentre(centreId);
    } catch {
      activity = [];
    }
  }

  return (
    <main className="landing-skin relative min-h-dvh overflow-x-hidden bg-[#06140f] text-paper">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-10 pt-6">
        <header className="animate-fade-up flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-energy/15 text-energy ring-1 ring-energy/30">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-energy/80">
                DriveScore Practice
              </p>
              <h1 className="font-display text-lg font-bold text-paper">
                Practice activity
              </h1>
            </div>
          </div>
          <Link href="/teacher" className="btn-ghost-dark px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </header>

        <p className="animate-fade-up mt-3 text-sm text-paper/55">
          Self-practice your students did on the DriveScore bank — lesson tests and
          full NEET mocks. Open any report to see their diagnosis.
        </p>

        <section className="animate-fade-up mt-6">
          {activity.length === 0 ? (
            <div className="card-glass p-5 text-sm text-paper/60">
              No practice attempts yet. When your students practise lessons or take
              a full mock from DriveScore, their results show up here.
            </div>
          ) : (
            <div className="card-glass divide-y divide-white/[0.06]">
              {activity.map((a) => {
                const Icon = a.kind === "bank" ? Shuffle : BookOpen;
                const score =
                  a.totalMarks != null && a.maxMarks != null
                    ? `${a.totalMarks}/${a.maxMarks}`
                    : "—";
                const acc = a.accuracy != null ? `${Math.round(a.accuracy)}%` : "—";
                return (
                  <div
                    key={a.attemptId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-energy/15 text-energy">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-paper">{a.studentName}</p>
                      <p className="truncate text-xs text-paper/50">
                        {a.title}
                        <span className="text-paper/30"> · {timeAgo(a.submittedAt)}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-bold tabular-nums text-paper">
                        {score}
                      </p>
                      <p className="text-[11px] text-paper/45">{acc} acc</p>
                    </div>
                    <Link
                      href={`/report?attempt=${a.attemptId}`}
                      className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-energy transition hover:bg-white/5"
                    >
                      <LineChart className="h-3.5 w-3.5" /> Report
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
