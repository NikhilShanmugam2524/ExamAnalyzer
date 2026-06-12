/**
 * Student progress dashboard (`/progress`).
 *
 * Server component: requires the student role, loads the derived progress data
 * (rating trend + chapter standings + recent attempts) and hands it to the
 * client dashboard. All data is read RLS-scoped, so a student only ever sees
 * their own progress.
 */

import { requireRole, getCurrentStudent } from "@/lib/auth";
import { getStudentProgress, type StudentProgress } from "@/lib/db/progress";
import { ProgressClient } from "@/components/progress/ProgressClient";

export const dynamic = "force-dynamic";

const EMPTY: StudentProgress = {
  trend: [],
  recent: [],
  strengths: [],
  weaknesses: [],
  attemptCount: 0,
};

export default async function ProgressPage() {
  await requireRole("student");

  let progress: StudentProgress = EMPTY;
  try {
    const student = await getCurrentStudent();
    if (student) progress = await getStudentProgress(student.id);
  } catch {
    progress = EMPTY;
  }

  return <ProgressClient progress={progress} />;
}
