"use client";

/**
 * The interactive test runner (client) — "focus mode" presentation.
 *
 * The flow/logic is UNCHANGED from Milestone 2a: one question at a time, NEET
 * pattern, a per-question timer that records seconds spent on EACH question,
 * and on Finish the answers go to the `submitAttempt` server action which
 * grades + persists them and returns the attempt id.
 *
 * This pass is presentation only: an immersive dark surface, tactile option
 * feedback, a smooth progress fill, slide/fade transitions between questions,
 * and a timer that pulses once you go over par — all reduced-motion-safe.
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  SkipForward,
} from "lucide-react";
import { DIFFICULTY_STYLES, SUBJECT_STYLES } from "@/components/categoryStyles";
import { fmtTime } from "@/lib/grade";
import { submitAttempt } from "@/app/actions";
import type { Attempt, PublicQuestion } from "@/lib/types";

export function TestRunner({
  questions,
  mockId,
}: {
  questions: PublicQuestion[];
  mockId: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Answers accumulate locally until the student finishes the whole mock.
  const answersRef = useRef<Attempt[]>([]);
  // Wall-clock timestamp when the current question was first shown.
  const shownAtRef = useRef<number>(Date.now());

  // Reset the per-question stopwatch whenever the question changes.
  useEffect(() => {
    shownAtRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - shownAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [index]);

  const question = questions[index];

  const goNext = useCallback(() => {
    if (!question || isPending) return;

    // Capture exact seconds spent on THIS question.
    const timeSec = Math.max(
      0,
      Math.round((Date.now() - shownAtRef.current) / 1000),
    );
    answersRef.current = [
      ...answersRef.current.filter((a) => a.questionId !== question.id),
      { questionId: question.id, pickedIndex: picked, timeSec },
    ];

    const isLast = index === questions.length - 1;
    if (isLast) {
      const answers = answersRef.current;
      startTransition(async () => {
        const { attemptId } = await submitAttempt(mockId, answers);
        router.push(`/report?attempt=${attemptId}`);
      });
    } else {
      setPicked(null);
      setIndex((i) => i + 1);
    }
  }, [question, picked, index, questions.length, mockId, isPending, router]);

  if (!question) {
    return (
      <main className="student-skin grid min-h-dvh place-items-center bg-focusink px-6 text-center text-sm text-paper/60">
        Loading the mock…
      </main>
    );
  }

  const total = questions.length;
  const progressPct = Math.round((index / total) * 100);
  const isLast = index === total - 1;
  const overPar = elapsed > question.parTimeSec;

  const qVariants = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, x: 44 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -44 },
      };

  return (
    <div className="student-skin min-h-dvh bg-focusink text-paper">
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 pb-8 pt-6">
        {/* Top bar: progress + timer */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-paper/55">
              <span>
                Question {index + 1} of {total}
              </span>
              <span>{progressPct}% done</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-energy shadow-[0_0_12px_rgba(0,224,184,0.7)]"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
              />
            </div>
          </div>
        </div>

        {/* Tags + per-question timer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`pill ${SUBJECT_STYLES[question.subject]}`}>
              {question.subject}
            </span>
            <span className={`pill ${DIFFICULTY_STYLES[question.difficulty]}`}>
              {question.difficulty}
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums ${
              overPar
                ? "bg-pop/20 text-pop ring-1 ring-pop/40 animate-timer-pulse"
                : "bg-white/5 text-paper/80 ring-1 ring-white/10"
            }`}
            aria-label="Time spent on this question"
          >
            <Clock className="h-4 w-4" />
            {fmtTime(elapsed)}
            <span className="text-[10px] font-medium text-paper/40">
              / par {fmtTime(question.parTimeSec)}
            </span>
          </div>
        </div>

        {/* Question (slides between items) */}
        <div className="mt-5 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={question.id}
              variants={qVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-energy-soft">
                {question.chapter}
              </p>
              {question.text && (
                <h2 className="mt-1.5 font-display text-xl font-bold leading-snug text-paper">
                  {question.text}
                </h2>
              )}

              {question.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={question.imageUrl}
                  alt="Question figure"
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white p-2"
                />
              )}

              <div className="mt-5 grid gap-2.5">
                {question.options.map((opt, i) => {
                  const selected = picked === i;
                  const letter = String.fromCharCode(65 + i); // A, B, C, D
                  return (
                    <motion.button
                      key={i}
                      onClick={() => setPicked(selected ? null : i)}
                      aria-pressed={selected}
                      whileTap={reduce ? undefined : { scale: 0.975 }}
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                        selected
                          ? "border-energy bg-energy/15 ring-2 ring-energy"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold transition ${
                          selected
                            ? "bg-energy text-focusink"
                            : "bg-white/10 text-paper/70"
                        }`}
                      >
                        {selected ? <CheckCircle2 className="h-5 w-5" /> : letter}
                      </span>
                      {opt && <span className="text-sm leading-snug text-paper">{opt}</span>}
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setPicked(null)}
            disabled={picked === null || isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-paper/85 transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4" />
            Clear / leave blank
          </button>
          <motion.button
            onClick={goNext}
            disabled={isPending}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="btn-energy flex-1"
          >
            {isPending ? (
              <>
                Saving <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : isLast ? (
              <>
                Finish <Flag className="h-4 w-4" />
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </div>
        <p className="mt-2.5 text-center text-[11px] text-paper/40">
          Unanswered questions are graded as <strong>left blank</strong> (0 marks).
        </p>
      </main>
    </div>
  );
}
