"use client";

/**
 * Parent view — a simple WhatsApp-style message card.
 * Score, strong area, 2 areas needing work, this week's focus.
 * Short, calm and reassuring.
 */

import { Check, CheckCheck } from "lucide-react";
import type { Report } from "@/lib/grade";
import { CATEGORY_META } from "@/lib/diagnose";
import { DEMO_STUDENTS } from "@/data/questions";

export function ParentView({ report }: { report: Report }) {
  const student = DEMO_STUDENTS[0];
  const firstName = student.name.split(" ")[0];

  const needsWork = report.weakChapters.slice(0, 2);
  const focus =
    report.groups.length > 0
      ? CATEGORY_META[report.groups[0].category]
      : null;

  const now = new Date();
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="grid gap-4">
      <p className="text-center text-xs font-medium text-ink/45">
        A preview of the weekly WhatsApp update parents receive
      </p>

      {/* Phone-ish chat frame */}
      <div className="mx-auto w-full max-w-sm rounded-3xl bg-[#0b1f1e] p-3 shadow-lg">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-2 pb-3 pt-1">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-teal font-display text-sm font-bold text-white">
            S
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">DriveScore</p>
            <p className="text-[11px] text-emerald-300/80">coaching updates</p>
          </div>
        </div>

        {/* The message bubble */}
        <div className="rounded-2xl rounded-tl-md bg-[#dcf8c6] p-4 text-[#0b2e16] shadow-sm">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Namaste! 🙏</span> Here&apos;s{" "}
            {firstName}&apos;s weekend mock update.
          </p>

          <div className="my-3 rounded-xl bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0b2e16]/60">
              This week&apos;s score
            </p>
            <p className="font-display text-2xl font-bold text-[#0b2e16]">
              {report.score}
              <span className="text-base font-semibold text-[#0b2e16]/60">
                {" "}
                / {report.maxScore}
              </span>
              <span className="ml-2 align-middle text-sm font-medium text-[#0b2e16]/70">
                ({report.accuracyPct}% accuracy)
              </span>
            </p>
          </div>

          <p className="text-sm leading-relaxed">
            💪 <span className="font-semibold">Strong area:</span>{" "}
            {report.strongestSubject ?? "—"} — {firstName} is confident here.
          </p>

          <p className="mt-2 text-sm leading-relaxed">
            📌 <span className="font-semibold">Needs a little work:</span>
          </p>
          <ul className="mt-1 ml-1 space-y-1 text-sm">
            {needsWork.length > 0 ? (
              needsWork.map((wc) => (
                <li key={`${wc.subject}-${wc.chapter}`}>
                  • {wc.chapter}{" "}
                  <span className="text-[#0b2e16]/60">({wc.subject})</span>
                </li>
              ))
            ) : (
              <li>• Nothing major this week — great consistency! 🎉</li>
            )}
          </ul>

          <div className="mt-3 rounded-xl bg-[#0b2e16]/[0.06] p-3">
            <p className="text-sm leading-relaxed">
              🎯 <span className="font-semibold">This week&apos;s focus:</span>{" "}
              {focus
                ? focus.advice
                : "Keep up the steady practice — no red flags this week."}
            </p>
          </div>

          <p className="mt-3 text-sm leading-relaxed">
            No need to worry — these are normal, fixable patterns. The teacher
            will guide {firstName} in class. 😊
          </p>

          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#0b2e16]/45">
            {time}
            <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
          </div>
        </div>

        {/* Faux input row */}
        <div className="mt-3 flex items-center gap-2 px-1">
          <div className="flex-1 rounded-full bg-white/10 px-4 py-2 text-xs text-white/40">
            Reply to the coaching centre…
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-teal text-white">
            <Check className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
