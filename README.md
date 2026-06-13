# DriveScore

**AI-powered NEET mock-test diagnosis platform for coaching centres.**

A B2B SaaS product that lets coaching centres run their weekend mock tests through the platform — auto-graded instantly, with a diagnosis report that explains *why* marks were lost (not just the score), delivered to students, teachers, and parents.

**Core value proposition:** "Your teachers teach. We make every weekend mock count."

---

## Architecture Overview

```
data/questions.ts                    ← seed source (one-time)
        │  npm run db:seed
        ▼
┌─────────────────────────────┐
│   SUPABASE  (Postgres)      │     ← where everything LIVES
│  centres · batches · students│
│  questions · mocks · attempts│
│  answers · profiles          │
└─────────────────────────────┘
     ▲ service key (privileged)       ▲ user-scoped client (RLS)
     │ grading, admin ops             │ user-facing reads
     │                                │
┌────────────┐  server action  ┌──────────┐
│ /test page │ ──────────────▶ │ /report  │
│ (server)   │  submitAttempt  │ (server) │
└────────────┘                 └──────────┘
     │ props                        │ props
     ▼                              ▼
TestRunner (client)            ReportTabs (client)
```

**Key principles:**
- The DB stores raw facts (which option picked, how many seconds). The diagnosis category is **never stored** — it's recomputed by `lib/diagnose.ts` every time a report loads (single source of truth).
- All database access is **server-side**. The browser never holds the secret key or talks to Postgres directly.
- `answer_index` (correct answers) **never reaches the browser**. Grading is server-side; questions are stripped before sending to the client.
- `centre_id` is **always set from the server session**, never trusted from the client/upload.

---

## Tech Stack

- **Next.js** (App Router) + React + TypeScript
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + Row Level Security)
- **@supabase/ssr** — cookie-based session handling
- **framer-motion** — animations and scroll reveals
- **react-three-fiber** + @react-three/drei — 3D landing page hero
- **papaparse** — CSV parsing for question import
- **lucide-react** — icons
- **PWA** — manifest.json + service worker for installability

---

## Role Model (3 roles)

| Role | Who | Access |
|---|---|---|
| **admin** | DriveScore platform owner. `centre_id = NULL`. One account. | **Cross-centre super-admin:** sees ALL centres, creates new centres + teacher accounts, can view any centre's data. |
| **teacher** | A coaching centre's manager. One per centre. | **Own centre only:** manages question bank, builds/publishes mocks, creates student accounts, views all reports for their centre. |
| **student** | A student at a centre. | Takes published mocks for their batch, sees their own diagnosis reports. |

**Login flow:** email + password → role lookup → redirect to role's landing:
- admin → `/admin` (platform dashboard)
- teacher → `/teacher` (centre management)
- student → `/` (student home, mocks for their batch)

---

## The Diagnosis Engine (`lib/diagnose.ts`)

The product's core IP. Pure logic, no AI/LLM needed. Classifies each question using first-match-wins:

```
if unattempted                          → TIME_MANAGEMENT
if correct && slow (> par × 1.4)        → TOO_SLOW
if correct                              → SOLID
-- wrong from here --
if difficulty = Easy                    → CARELESS
if Medium/Hard && rushed (< par × 0.4)  → GUESS
else                                    → CONCEPT_GAP
```

| Category | Title | What it means | Who acts |
|---|---|---|---|
| CONCEPT_GAP | Concept Gaps | Genuinely didn't know it | Teacher re-teaches |
| CARELESS | Careless Slips | Knew it, slipped on an easy one | Student slows down |
| GUESS | Guessing | Rushed a hard question without working it | Student uses elimination |
| TOO_SLOW | Too Slow | Correct but not fluent enough | Student practises speed |
| TIME_MANAGEMENT | Time Management | Left blank, ran out of time | Student works on pacing |

**Teacher "What to re-teach" list** pulls from CONCEPT_GAP only (the rest are student-behavior fixes, not teaching gaps).

---

## Database Schema (8 tables)

```
centres ──▶ batches ──▶ students
   │              │
   ├──▶ questions  └──▶ teacher_id (profiles)
   └──▶ mocks (status: draft/published)
            └──▶ mock_questions (ordered join)

profiles (id → auth.users, role, centre_id, full_name)

attempts (mock_id, student_id, total_marks, accuracy, submitted_at)
   └──▶ answers (question_id, picked_index, time_sec)
```

Migrations (apply in order in Supabase SQL Editor):
1. `0001_init.sql` — base schema (8 tables)
2. `0002_auth.sql` — profiles table, batches.teacher_id, students.profile_id
3. `0003_rls.sql` — initial RLS policies + helper functions (auth_role, auth_centre, auth_student_id)
4. `0004_questions_rls.sql` — question management policies
5. `0005_mocks.sql` — mock status column + auth_student_batch() + student mock policies
6. `0006_role_restructure.sql` — platform admin (cross-centre) + teacher centre-management policies

---

## Security Model

- **Row Level Security (RLS)** enabled on all tables with per-role policies.
- **`import "server-only"`** guards the service key at compile time — build fails if any client component imports the DB layer.
- **SECURITY DEFINER** helper functions (`auth_role()`, `auth_centre()`, `auth_student_id()`, `auth_student_batch()`) avoid recursive policies.
- **Two clients:**
  - Service client (secret key, bypasses RLS): grading, admin creating auth users.
  - User-scoped client (anon key + session, RLS enforced): all user-facing reads.
- **Students cannot read the `questions` table** via the user/anon client (answer keys protected).
- **Cross-centre isolation** enforced at the database level — a teacher cannot see another centre's data.
- **Server-side grading** — the client cannot fake scores; `answer_index` is never sent to the browser.

---

## Key File Structure

```
lib/
  diagnose.ts              ← the diagnosis engine (pure, unit-testable)
  diagnose.test.ts         ← 13 unit tests including regression cases
  grade.ts                 ← grading + report aggregation (NEET +4/−1/0)
  types.ts                 ← shared TypeScript types
  auth.ts                  ← requireRole, getCurrentUser, getCurrentStudent
  db/
    client.ts              ← server-only Supabase service client
    queries.ts             ← getMockWithQuestions, createAttempt, saveAttempt, getAttempt, etc.
    questions.ts           ← question bank CRUD (listQuestions, createQuestion, etc.)
    mocks.ts               ← mock builder DB layer (listMocksForCentre, saveMock, etc.)
    admin.ts               ← platform admin DB layer (listAllCentres, createCentre, createTeacherAccount)
  supabase/
    middleware.ts          ← session refresh + route protection
    server.ts / client.ts  ← SSR client helpers
  questions/
    validate.ts            ← shared CSV row validation (client preview + server)
  session.tsx              ← report-view persona context (student/teacher/parent toggle)

data/
  questions.ts             ← 18 seed questions + fixed 9-question mock (seed source only)

supabase/
  migrations/              ← 0001 through 0006 (apply in order)

scripts/
  seed.ts                  ← idempotent seeder (npm run db:seed)
  verify-rls.ts            ← re-runnable security verifier

components/
  mascot/Neuro.tsx         ← original neuron mascot SVG (4 moods: welcome/cheer/encourage/thinking)
  report/
    DiagnosisGroups.tsx    ← per-category question list
    StudentView.tsx        ← student report with Neuro reaction + confetti
    TeacherView.tsx        ← batch snapshot + re-teach list (CONCEPT_GAP only)
    ParentView.tsx         ← short reassuring parent summary
    ReportTabs.tsx         ← three-view toggle wrapper
    ScoreRing.tsx          ← animated SVG score ring with count-up
    Confetti.tsx           ← one-shot confetti burst on good score
  motion/
    useCountUp.ts          ← animated number hook (reduced-motion safe)
  test/
    TestRunner.tsx         ← dark focus-mode test UI (immersive, spring animations)
  home/
    HomeClient.tsx         ← student home — lists batch mocks with Neuro mascot
  admin/
    QuestionForm.tsx       ← add/edit question form (useFormState)
    CsvImport.tsx          ← CSV bulk import with per-row preview
    DeleteQuestionButton.tsx
    MockBuilder.tsx        ← filterable picker + ordered selection + subject breakdown
    MockRowActions.tsx     ← publish/unpublish toggle + delete
    CreateStudentForm.tsx  ← create student login (shows temp password once)
  auth/
    LoginForm.tsx          ← email + password login form
    LogoutButton.tsx
  landing/
    AuroraBackground.tsx   ← CSS aurora with DNA helix + molecule SVG motifs
    CinematicBackground.tsx ← aurora (always) + WebGL scene (capability-gated)
    HeroScene3D.tsx        ← react-three-fiber scene: DNA, molecules, neural net, orbitals, motes
    useDeviceCapability.ts ← WebGL / reduced-motion / mobile / low-power detection
    Reveal.tsx             ← whileInView scroll-reveal wrapper
    Parallax.tsx           ← scroll parallax wrapper

app/
  welcome/page.tsx         ← public marketing landing page (cinematic, 3D, 8 sections)
  login/page.tsx           ← email + password login
  page.tsx                 ← student home (requireRole("student") → HomeClient)
  admin/
    page.tsx               ← platform super-admin dashboard (all centres + stats)
    actions.ts             ← createCentreAction, createTeacherAction, createStudent(teacher)
    centres/
      new/page.tsx         ← create a coaching centre
      [id]/page.tsx        ← view any centre's students/reports
    teachers/
      new/page.tsx         ← create a teacher account for a centre
    questions/             ← redirects to /teacher/questions (moved)
    mocks/                 ← redirects to /teacher/mocks (moved)
  teacher/
    page.tsx               ← centre management dashboard (Q bank, Mocks, Add Student, Students)
    questions/
      page.tsx             ← question bank CRUD + CSV import
      [id]/edit/page.tsx   ← edit a question
    mocks/
      page.tsx             ← mocks list (draft/published status)
      new/page.tsx         ← mock builder
      [id]/edit/page.tsx   ← edit a mock
  test/page.tsx            ← test-taking (requireRole student, access check, strip answerIndex)
  report/page.tsx          ← diagnosis report (server → ReportTabs client)
  actions.ts               ← submitAttempt server action (server-side grading)
```

---

## Milestones Completed

1. **M1 — Core v1:** test engine, diagnosis engine (4 categories), 3 report views (student/teacher/parent), NEET +4/−1 marking, per-question timing.
2. **Engine refinement:** added GUESS category (5 categories), fixed careless-on-hard bug, teacher re-teach list = concept gaps only. 13 unit tests.
3. **M2a — Database:** Supabase Postgres, full schema (8 tables), persistence, seed data, server-only access.
4. **M2b-1 — Auth:** email/password login (Supabase Auth), 3 roles, login redirects, role guards, admin creates student accounts.
5. **M2b-2 — RLS:** database-level per-user security, SECURITY DEFINER helpers, user-scoped client for RLS-enforced reads.
6. **Student UI polish:** Neuro mascot (original neuron SVG, 4 moods), Bricolage Grotesque + Hanken Grotesk fonts, energetic palette (mint/coral/amber), score count-up, confetti, staggered reveals, dark focus-mode test screen, prefers-reduced-motion support.
7. **Landing page:** cinematic marketing page at `/welcome` with 3D science-themed background (DNA helix, molecular structures, neural network), scroll reveals, mouse parallax, mobile CSS fallback, 8 content sections for B2B pitch.
8. **M2c-1 — Question Bank:** manual add + CSV bulk import with per-row validation, teacher CRUD, centre-scoped RLS.
9. **M2c-2 — Mock Builder:** assemble mocks from bank, set order, assign to batch, draft/published status, students see batch-assigned published mocks.
10. **Role restructure:** admin = platform super-admin (cross-centre, centre_id NULL), teacher = centre manager (full centre CRUD). Multi-tenant ready.

---

## What's NOT Built Yet (Remaining Roadmap)

**Immediate (needed for first pilot):**
- [ ] **Deploy to Vercel** — get it off localhost onto a real URL
- [ ] **Point domain root** (`/`) to landing page for logged-out visitors
- [ ] **Test full flow on a real phone** — never verified on mobile end-to-end

**Short-term (improves onboarding):**
- [ ] Bulk student import (CSV) — same pattern as question import
- [ ] Password reset — Supabase has this built-in
- [ ] Batch management (create/rename batches from teacher UI)

**Medium-term (real feature gaps):**
- [ ] Parent report delivery (actual WhatsApp send via a provider)
- [ ] Mock scheduling (open Saturday 9am, close 11am)
- [ ] One-attempt-per-mock enforcement
- [ ] Student attempt history (trend over time)

**V2 (future product expansion):**
- [ ] AI Tutor — LLM-powered explanations in Tamil (Claude API, key on backend)
- [ ] Gamification (XP, streaks, badges, level system)
- [ ] Anti-cheat / lockdown mode (native app)
- [ ] Adaptive practice (home mode, not trusted assessment)
- [ ] Phone OTP login (SMS gateway cost)

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- A Supabase project (free tier, Mumbai region recommended for India)

### 1. Clone & install
```bash
git clone <repo-url>
cd DriveScore
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<your service_role/secret key — NEVER commit>

SEED_ADMIN_EMAIL=admin@DriveScore.test
SEED_ADMIN_PASSWORD=<your choice>
SEED_TEACHER_EMAIL=teacher@DriveScore.test
SEED_TEACHER_PASSWORD=<your choice>
SEED_STUDENT_EMAIL=student@DriveScore.test
SEED_STUDENT_PASSWORD=<your choice>
```

### 3. Apply migrations (in order, in Supabase SQL Editor)
Run each file from `supabase/migrations/` in order: 0001 → 0002 → 0003 → 0004 → 0005 → 0006.

### 4. Seed the database
```bash
npm run db:seed
```

### 5. Run
```bash
npm run dev    # → http://localhost:3000
```

### 6. Test logins
- admin → `/admin` (platform super-admin, all centres)
- teacher → `/teacher` (centre management: questions, mocks, students)
- student → `/` (take mocks, view reports)

---

## Competitive Context

**Target market:** Tamil Nadu NEET coaching centres (tier-2/3), expanding to JEE.

**Key competitors:** VVT Coaching (claims AI but delivers dashboards), Spiro, Jupiter, Shankar Medico, the Namakkal cluster. National giants (Allen, Aakash) build in-house.

**DriveScore's edge:** the diagnosis depth (5-category "why," not just "what"), the three-audience reports (student/teacher/parent), and a B2B model that arms centres rather than competing with them.

**Pitch:** "You keep your faculty and your brand. We're the AI brain underneath."

---

## Business Model

- **B2B SaaS** — sell to coaching centres, not students directly.
- **Recurring revenue** — per student per month, or flat monthly license.
- **Sticky** — once a centre's test data lives in the system, switching is painful.
- **Land and expand** — enter with the mock-test layer, upsell AI tutor and adaptive practice later.
- **The moat** — diagnosis depth + accumulated performance data. The longer it runs, the smarter and harder to copy.
