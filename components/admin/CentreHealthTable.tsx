"use client";

/**
 * Centre Health table — the churn radar.
 *
 * One row per centre with the activity signals that tell the platform owner who
 * is thriving, who's going quiet, and who never got off the ground. Sortable
 * (default: most-at-risk first) and scannable. Read-only — each row links to the
 * existing /admin/centres/[id] detail view.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, ChevronRight } from "lucide-react";
import type { CentreHealthRow, CentreStatus } from "@/lib/db/adminAnalytics";

type SortKey =
  | "status"
  | "name"
  | "students"
  | "questions"
  | "mocks"
  | "attempts30d"
  | "lastActivity";

const STATUS_META: Record<
  CentreStatus,
  { label: string; dot: string; chip: string; rank: number }
> = {
  // rank drives the default sort: most-at-risk (dormant) first.
  dormant: {
    label: "Dormant",
    dot: "bg-rose-400",
    chip: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
    rank: 0,
  },
  quiet: {
    label: "Quiet",
    dot: "bg-amber-400",
    chip: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    rank: 1,
  },
  active: {
    label: "Active",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    rank: 2,
  },
};

function fmtAgo(days: number | null): string {
  if (days === null) return "Never";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 60) return "1mo ago";
  return `${Math.floor(days / 30)}mo ago`;
}

export function CentreHealthTable({ rows }: { rows: CentreHealthRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const val = (r: CentreHealthRow): number | string => {
      switch (sortKey) {
        case "status":
          return STATUS_META[r.status].rank;
        case "name":
          return r.name.toLowerCase();
        case "students":
          return r.studentCount;
        case "questions":
          return r.questionCount;
        case "mocks":
          return r.publishedMockCount;
        case "attempts30d":
          return r.attempts30d;
        case "lastActivity":
          // Never (null) sorts as most-stale.
          return r.lastActivityDays === null ? Number.POSITIVE_INFINITY : r.lastActivityDays;
      }
    };
    const dir = asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
  }, [rows, sortKey, asc]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setAsc((v) => !v);
    } else {
      setSortKey(key);
      // Sensible default direction per column.
      setAsc(key === "name");
    }
  };

  if (rows.length === 0) {
    return (
      <div className="card-glass p-5 text-sm text-paper/60">
        No centres yet —{" "}
        <Link href="/admin/centres/new" className="font-semibold text-energy hover:underline">
          create the first one
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="card-glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-[11px] uppercase tracking-wider text-paper/45">
              <Th label="Status" col="status" {...{ sortKey, asc, toggle }} />
              <Th label="Centre" col="name" {...{ sortKey, asc, toggle }} />
              <Th label="Students" col="students" align="right" {...{ sortKey, asc, toggle }} />
              <Th label="Qs" col="questions" align="right" {...{ sortKey, asc, toggle }} />
              <Th label="Pub. mocks" col="mocks" align="right" {...{ sortKey, asc, toggle }} />
              <Th label="Attempts 30d" col="attempts30d" align="right" {...{ sortKey, asc, toggle }} />
              <Th label="Last activity" col="lastActivity" align="right" {...{ sortKey, asc, toggle }} />
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {sorted.map((r) => {
              const s = STATUS_META[r.status];
              return (
                <tr key={r.centreId} className="group transition hover:bg-white/[0.03]">
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${s.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/centres/${r.centreId}`}
                      className="font-display font-semibold text-paper hover:text-energy"
                    >
                      {r.name}
                    </Link>
                    {r.stalledOnboarding && (
                      <span
                        className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-300/90"
                        title="Has students but the teacher hasn't published any mock yet"
                      >
                        <AlertTriangle className="h-3 w-3" /> Stalled onboarding
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-paper/80">
                    {r.studentCount}
                    <span className="ml-1 text-[11px] text-paper/40">
                      ({r.activeStudents} active)
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-paper/70">
                    {r.questionCount}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-paper/70">
                    {r.publishedMockCount}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-paper/80">
                    {r.attempts30d}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-paper/60">
                    {fmtAgo(r.lastActivityDays)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/admin/centres/${r.centreId}`}
                      className="inline-flex text-paper/30 transition group-hover:text-energy"
                      aria-label={`Open ${r.name}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  col,
  align = "left",
  sortKey,
  asc,
  toggle,
}: {
  label: string;
  col: SortKey;
  align?: "left" | "right";
  sortKey: SortKey;
  asc: boolean;
  toggle: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className={`px-3 py-2.5 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => toggle(col)}
        className={`inline-flex items-center gap-1 transition hover:text-paper/80 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-energy" : ""}`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-90" : "opacity-30"}`} />
        {active && <span className="text-[9px]">{asc ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
