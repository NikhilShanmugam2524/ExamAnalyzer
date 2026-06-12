/**
 * View a specific centre's data. Admin-only.
 *
 * Shows questions, mocks, and students for the selected centre. Admin is
 * viewing read-only through that centre's lens using the service key.
 */

import Link from "next/link";
import { ArrowLeft, BookOpen, FileStack, GraduationCap, Users2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCentreDetail } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function AdminCentreDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("admin");

  let centre: Awaited<ReturnType<typeof getCentreDetail>> | null = null;
  try {
    centre = await getCentreDetail(params.id);
  } catch {
    centre = null;
  }

  if (!centre) {
    return (
      <main className="mx-auto min-h-dvh max-w-4xl px-5 pb-14 pt-6">
        <div className="card p-5 text-sm text-ink/60">
          Centre not found.{" "}
          <Link href="/admin" className="font-semibold text-teal-deep hover:underline">
            Back to dashboard
          </Link>
          .
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 pb-14 pt-6">
      <header className="animate-fade-up flex items-center gap-3">
        <Link
          href="/admin"
          className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white text-ink/70 transition hover:bg-black/[0.03]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
            Platform Admin · Centre
          </p>
          <h1 className="font-display text-lg font-bold text-ink">{centre.name}</h1>
        </div>
      </header>

      {/* Stats */}
      <section className="animate-fade-up mt-6 grid grid-cols-3 gap-3">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Questions" value={centre.questionCount} />
        <StatCard icon={<FileStack className="h-4 w-4" />} label="Mocks" value={centre.mockCount} />
        <StatCard icon={<GraduationCap className="h-4 w-4" />} label="Students" value={centre.students.length} />
      </section>

      {/* Centre ID (for creating teacher) */}
      <section className="animate-fade-up mt-4">
        <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">Centre ID</p>
          <p className="mt-0.5 break-all font-mono text-xs text-ink/70">{centre.id}</p>
        </div>
      </section>

      {/* Students */}
      <section className="animate-fade-up mt-6">
        <div className="mb-2.5 flex items-center gap-2">
          <Users2 className="h-4 w-4 text-ink/50" />
          <h2 className="font-display text-lg font-bold text-ink">
            Students ({centre.students.length})
          </h2>
        </div>

        {centre.students.length === 0 ? (
          <div className="card p-5 text-sm text-ink/60">No students yet.</div>
        ) : (
          <div className="card divide-y divide-black/[0.05]">
            {centre.students.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink/50">{s.batchName}</p>
                </div>
                {s.latestAttemptId ? (
                  <Link
                    href={`/report?attempt=${s.latestAttemptId}`}
                    className="text-xs font-semibold text-teal-deep hover:underline"
                  >
                    View report
                  </Link>
                ) : (
                  <span className="text-xs text-ink/40">No attempt</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-4 text-center">
      <div className="mb-1 flex justify-center text-teal-deep">{icon}</div>
      <p className="font-display text-xl font-bold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] font-medium text-ink/50">{label}</p>
    </div>
  );
}
