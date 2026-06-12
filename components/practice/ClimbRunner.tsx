"use client";

/**
 * Gamified lesson run (Climb + Practice MERGED).
 *
 * Adaptive & endless: questions stream one at a time, difficulty rises on a
 * correct answer and drops on a wrong one. Correct → gain XP + heal HP + build a
 * streak; wrong → lose HP (Easy mistakes hurt most) + reset streak. The run ends
 * at 0 HP (or when the chapter pool is exhausted), then the answered questions
 * are persisted as an attempt and the student lands on the FULL diagnosis report.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Flag, Flame, Heart, Loader2, XCircle, Zap,
} from "lucide-react";
import {
  nextClimbQuestion, gradeClimbAnswer, finishClimbRun, reportClimbQuestion,
} from "@/app/practice/climb/actions";
import type { Attempt, Difficulty } from "@/lib/types";

type Q = {
  id: string; subject: string; chapter: string; concept: string;
  difficulty: Difficulty; parTimeSec: number; text: string;
  options: string[]; imageUrl: string | null;
};

const DIFF_MULT: Record<Difficulty, number> = { Easy: 1, Medium: 1.5, Hard: 2 };
const DAMAGE: Record<Difficulty, number> = { Easy: 25, Medium: 15, Hard: 10 };
const DIFF_VAL: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 }; // CAT scale
const THETA_STEP = 0.6; // how fast the ability estimate moves
const HEAL = 8;
const START_HP = 100;

function xpFor(diff: Difficulty, fast: boolean, streak: number) {
  return Math.round(10 * DIFF_MULT[diff] * (fast ? 1.5 : 1) * (1 + 0.1 * Math.min(streak, 5)));
}

export function ClimbRunner({
  subject, chapter, source = "pyq",
}: {
  subject: string; chapter: string; source?: "pyq" | "ai";
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "answering" | "feedback" | "finishing" | "error">("loading");
  const [hp, setHp] = useState(START_HP);
  const [rung, setRung] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [q, setQ] = useState<Q | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctIdx, setCorrectIdx] = useState(-1);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastDelta, setLastDelta] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const seenRef = useRef<string[]>([]);
  const answersRef = useRef<Attempt[]>([]);
  const startedAt = useRef<number>(Date.now());
  const hpRef = useRef(START_HP);
  const pendingRung = useRef(0);
  const thetaRef = useRef(0.5); // CAT ability estimate (0=Easy … 2=Hard)
  const busy = useRef(false);

  /** Fetch the next question for a rung. Returns false if the pool is exhausted. */
  async function load(forRung: number): Promise<boolean> {
    setPhase("loading");
    const next = await nextClimbQuestion(subject, chapter, forRung, seenRef.current, source);
    if (!next) return false;
    seenRef.current = [...seenRef.current, next.id];
    setQ(next as Q);
    setPicked(null);
    setCorrectIdx(-1);
    setReported(false);
    startedAt.current = Date.now();
    setPhase("answering");
    return true;
  }

  async function finishAndGo() {
    setPhase("finishing");
    if (answersRef.current.length === 0) { router.push("/practice"); return; }
    const res = await finishClimbRun(chapter, answersRef.current);
    if ("attemptId" in res) {
      router.push(`/report?attempt=${res.attemptId}&xp=${xp}&streak=${maxStreak}`);
    } else {
      setErr(res.error);
      setPhase("error");
    }
  }

  useEffect(() => {
    (async () => { if (!(await load(0))) await finishAndGo(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (picked === null || !q || busy.current) return;
    busy.current = true;
    const { correct, correctIndex } = await gradeClimbAnswer(q.id, picked);
    const timeSec = Math.round((Date.now() - startedAt.current) / 1000);
    const fast = timeSec <= q.parTimeSec;
    answersRef.current.push({ questionId: q.id, pickedIndex: picked, timeSec });
    setCorrectIdx(correctIndex);
    setLastCorrect(correct);

    if (correct) {
      const ns = streak + 1;
      setStreak(ns);
      setMaxStreak((m) => Math.max(m, ns));
      setXp((x) => x + xpFor(q.difficulty, fast, ns));
      setLastDelta(xpFor(q.difficulty, fast, ns));
      setHp((h) => { const v = Math.min(100, h + HEAL); hpRef.current = v; return v; });
    } else {
      const dmg = DAMAGE[q.difficulty];
      setHp((h) => { const v = Math.max(0, h - dmg); hpRef.current = v; return v; });
      setStreak(0);
      setLastDelta(-dmg);
    }

    // CAT-style ability update (Elo-lite): the harder the question relative to
    // your current ability, the more a correct answer raises θ — and vice-versa.
    const d = DIFF_VAL[q.difficulty];
    const expected = 1 / (1 + Math.exp(-(thetaRef.current - d)));
    thetaRef.current = Math.max(0, Math.min(2, thetaRef.current + THETA_STEP * ((correct ? 1 : 0) - expected)));
    pendingRung.current = Math.round(thetaRef.current); // serve the best-matched band next

    setPhase("feedback");
    busy.current = false;
  };

  const next = async () => {
    if (hpRef.current <= 0) { await finishAndGo(); return; }
    setRung(pendingRung.current);
    if (!(await load(pendingRung.current))) await finishAndGo();
  };

  const hpColor = hp > 50 ? "bg-energy" : hp > 20 ? "bg-reward" : "bg-pop";

  if (phase === "finishing") {
    return (
      <main className="student-skin mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-paper">
        <Loader2 className="h-8 w-8 animate-spin text-energy" />
        <p className="mt-4 font-display text-lg font-bold">Building your report…</p>
        <p className="mt-1 text-sm text-paper/55">{xp} XP · best streak {maxStreak}</p>
      </main>
    );
  }
  if (phase === "error") {
    return (
      <main className="student-skin mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-paper">
        <p className="font-display text-lg font-bold">Couldn&apos;t build the report</p>
        <p className="mt-2 rounded-lg bg-pop/15 px-3 py-2 text-sm text-[#FF9A91]">{err}</p>
        <Link href="/practice" className="btn-ghost-dark mt-4 text-sm">Back to practice</Link>
      </main>
    );
  }

  return (
    <main className="student-skin mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6 text-paper">
      {/* HUD */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-pop">
          <Heart className="h-5 w-5 fill-current" />
          <div className="h-2.5 w-28 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full ${hpColor} transition-all duration-500`} style={{ width: `${hp}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-paper/70">{hp}</span>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-reward/15 px-2.5 py-1 text-xs font-bold text-reward">
          <Flame className="h-3.5 w-3.5" /> {streak}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-energy/15 px-2.5 py-1 text-xs font-bold text-energy">
          <Zap className="h-3.5 w-3.5" /> {xp} XP
        </span>
      </div>

      {phase === "loading" || !q ? (
        <div className="flex flex-1 items-center justify-center text-paper/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-6 flex-1">
          <div className="flex items-center gap-2">
            <span className="pill bg-accent2/20 text-[#B7AEFF]">{q.subject}</span>
            <span className={`pill ${q.difficulty === "Hard" ? "bg-pop/20 text-[#FF9A91]" : q.difficulty === "Medium" ? "bg-reward/20 text-reward" : "bg-energy/15 text-energy"}`}>
              {q.difficulty}
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-energy-soft">{q.chapter}</p>
          {q.text && <h2 className="mt-1.5 font-display text-xl font-bold leading-snug text-paper">{q.text}</h2>}
          {q.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={q.imageUrl} alt="Question figure" className="mt-4 w-full rounded-2xl border border-white/10 bg-white p-2" />
          )}

          <div className="mt-5 grid gap-2.5">
            {q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isPicked = picked === i;
              const reveal = phase === "feedback";
              const isCorrect = reveal && i === correctIdx;
              const isWrongPick = reveal && isPicked && i !== correctIdx;
              const cls = isCorrect
                ? "border-energy bg-energy/15 ring-2 ring-energy"
                : isWrongPick
                  ? "border-pop bg-pop/15 ring-2 ring-pop"
                  : isPicked
                    ? "border-energy bg-energy/15 ring-2 ring-energy"
                    : "border-white/10 bg-white/5 hover:bg-white/10";
              return (
                <button
                  key={i}
                  disabled={reveal}
                  onClick={() => setPicked(isPicked ? null : i)}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${cls}`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-bold text-paper/70">
                    {isCorrect ? <CheckCircle2 className="h-5 w-5 text-energy" /> : isWrongPick ? <XCircle className="h-5 w-5 text-pop" /> : letter}
                  </span>
                  {opt && <span className="text-sm leading-snug text-paper">{opt}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="mt-6">
        {phase === "feedback" ? (
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${lastCorrect ? "text-energy" : "text-pop"}`}>
              {lastCorrect ? `Correct! +${lastDelta} XP · +${HEAL} HP` : `Wrong — ${lastDelta} HP`}
            </span>
            <button
              onClick={() => { if (q && !reported) { setReported(true); reportClimbQuestion(q.id); } }}
              disabled={reported}
              className="inline-flex items-center gap-1 text-xs font-semibold text-paper/45 transition hover:text-pop disabled:opacity-50"
              title="Report a wrong/bad question"
            >
              <Flag className="h-3.5 w-3.5" /> {reported ? "Reported" : "Report"}
            </button>
            <button onClick={next} className="btn-energy ml-auto flex-1 max-w-[50%] py-3">
              {hp <= 0 ? "See report" : "Next"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={picked === null || phase !== "answering"}
            className="btn-energy w-full py-3 disabled:opacity-40"
          >
            Check answer
          </button>
        )}
      </div>
    </main>
  );
}
