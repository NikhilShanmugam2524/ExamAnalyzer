"use client";

/**
 * Client-side test session state.
 *
 * No backend in this milestone, so the whole mock session lives in React
 * state held by this provider (mounted once in the root layout). It is also
 * mirrored to `sessionStorage` so a page refresh on the report screen does
 * not wipe the result.
 *
 * Later milestones can swap this provider's internals for real auth + API
 * calls without touching the screens that consume the hook.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Attempt, Question, Role } from "./types";
import { getMockQuestions } from "@/data/questions";

type SessionState = {
  role: Role;
  questions: Question[];
  attempts: Attempt[];
  /** True once the student has finished the mock. */
  finished: boolean;
};

type SessionContextValue = SessionState & {
  setRole: (role: Role) => void;
  /** Begin a fresh mock with the fixed question set. */
  startMock: () => void;
  /** Record (or overwrite) the attempt for one question. */
  recordAttempt: (attempt: Attempt) => void;
  /** Mark the mock finished — grading happens downstream from attempts. */
  finishMock: () => void;
  /** Clear everything (back to home / retake). */
  reset: () => void;
};

const STORAGE_KEY = "DriveScore.session.v1";

const SessionContext = createContext<SessionContextValue | null>(null);

function loadInitial(): SessionState {
  const base: SessionState = {
    role: "student",
    questions: [],
    attempts: [],
    finished: false,
  };
  if (typeof window === "undefined") return base;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(loadInitial);

  // Mirror to sessionStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [state]);

  const setRole = useCallback((role: Role) => {
    setState((s) => ({ ...s, role }));
  }, []);

  const startMock = useCallback(() => {
    setState((s) => ({
      ...s,
      questions: getMockQuestions(),
      attempts: [],
      finished: false,
    }));
  }, []);

  const recordAttempt = useCallback((attempt: Attempt) => {
    setState((s) => {
      const rest = s.attempts.filter(
        (a) => a.questionId !== attempt.questionId,
      );
      return { ...s, attempts: [...rest, attempt] };
    });
  }, []);

  const finishMock = useCallback(() => {
    setState((s) => ({ ...s, finished: true }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({
      role: s.role, // keep the previewing role
      questions: [],
      attempts: [],
      finished: false,
    }));
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      setRole,
      startMock,
      recordAttempt,
      finishMock,
      reset,
    }),
    [state, setRole, startMock, recordAttempt, finishMock, reset],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a <SessionProvider>");
  }
  return ctx;
}
