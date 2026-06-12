"use client";

/**
 * Report presentation + the Student / Teacher / Parent toggle (client).
 *
 * Receives an already-graded `Report` (built server-side from the persisted
 * attempt) and renders the same three views as before. The grouped diagnosis
 * inside these views is computed by the engine — this component is pure
 * presentation + the role switch.
 */

import { useRouter } from "next/navigation";
import { GraduationCap, RotateCcw, Stethoscope, Users } from "lucide-react";
import { useSession } from "@/lib/session";
import type { Report } from "@/lib/grade";
import type { Role } from "@/lib/types";
import { StudentView } from "@/components/report/StudentView";
import { TeacherView } from "@/components/report/TeacherView";
import { ParentView } from "@/components/report/ParentView";

const TABS: { id: Role; label: string; icon: typeof GraduationCap }[] = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "teacher", label: "Teacher", icon: Stethoscope },
  { id: "parent", label: "Parent", icon: Users },
];

export function ReportTabs({
  report,
  viewerRole,
  gameStats,
}: {
  report: Report;
  /** The logged-in user's auth role. Students only ever see the Student view. */
  viewerRole?: "student" | "teacher" | "admin";
  /** Optional run payoff carried over from a gamified practice run. */
  gameStats?: { xp: number; streak: number };
}) {
  const router = useRouter();
  const { role, setRole, reset } = useSession();

  const retake = () => {
    reset();
    router.push("/");
  };

  // A student must only ever see their own (Student) report — no persona toggle.
  const locked = viewerRole === "student";
  const view: Role = locked ? "student" : role;
  const warm = view === "student";

  return (
    <main
      className={`mx-auto min-h-dvh max-w-4xl px-5 pb-10 pt-6 ${
        warm
          ? "student-skin bg-[radial-gradient(120%_60%_at_50%_0%,rgba(0,224,184,0.12),transparent_60%)]"
          : ""
      }`}
    >
      {/* Header + role toggle */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                warm ? "text-energy-deep" : "text-teal-deep"
              }`}
            >
              Diagnosis report
            </p>
            <h1
              className={`font-display font-bold text-ink ${
                warm ? "text-2xl font-extrabold" : "text-xl"
              }`}
            >
              {warm ? "Here's your breakdown" : "Mock test analysis"}
            </h1>
          </div>
          <button
            onClick={retake}
            className="btn-ghost px-3 py-2 text-xs"
            aria-label="Retake the mock"
          >
            <RotateCcw className="h-4 w-4" />
            Retake
          </button>
        </div>

        {gameStats && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-energy/15 px-2.5 py-1 text-energy-deep">
              ⚡ {gameStats.xp} XP this run
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2.5 py-1 text-[#9a6800]">
              🔥 best streak {gameStats.streak}
            </span>
          </div>
        )}

        {/* Three faces, same data — only staff (teacher/admin) get the toggle. */}
        {!locked && (
          <div
            role="tablist"
            aria-label="Report view"
            className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/[0.04] p-1"
          >
            {TABS.map((t) => {
              const active = t.id === view;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRole(t.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-white text-ink shadow-sm"
                      : "text-ink/55 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* The selected face */}
      <section key={view} className="animate-fade-up mt-5">
        {view === "student" && <StudentView report={report} />}
        {view === "teacher" && <TeacherView report={report} />}
        {view === "parent" && <ParentView report={report} />}
      </section>
    </main>
  );
}
