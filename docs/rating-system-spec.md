# DriveScore Skill Rating & Levels — Design Spec (v1)

**Status:** agreed in discussion, not yet built.
**Goal:** a fair, persistent, motivating skill measure for every student — competition
without the demoralization of a raw rank ladder.

---

## 1. Why Elo (and not a points total)

Every alternative we considered fails one of the fairness requirements:

| Metric | Problem |
|---|---|
| Total marks / XP sum | Rewards sheer volume — grind 500 easy questions, win. |
| Accuracy % | Rewards timidity — answer 2 easy questions correctly, "100%". |
| Rank ladder | Demoralizes everyone below the top 10. |

**Elo measures the hardest level you reliably beat, not how much you did.**
Every question is an "opponent" with a rating; answering is a match.

- Correct on a question above your rating → big gain.
- Correct on a question far below you → ~zero gain (volume farming dies here).
- Wrong on a hard question → tiny loss (expected outcome, no shame).
- Wrong on an easy question → meaningful loss.

It is deterministic and explainable ("Hard question solved: +18") — consistent
with the product's no-black-box positioning. A strong late joiner converges to
their true rating within ~50 questions, so there is no seniority bias; the
rating runs from sign-up until the real exam with no resets and no rolling
windows.

---

## 2. The math

### Question rating (static in v1)

Derived from the existing `questions.difficulty` column — no schema change:

| Difficulty | Rating |
|---|---|
| Easy | 800 |
| Medium | 1100 |
| Hard | 1400 |

(v2 may calibrate these from empirical correct-rates; constants are fine to start.)

### Student rating

One rating **per subject** (Physics, Chemistry, Biology), starting at **1000**.

For each answered question, in test order:

```
expected = 1 / (1 + 10 ^ ((Q − S) / 400))     // Q = question rating, S = student rating
S' = S + K × (actual − expected)               // actual: 1 correct, 0 wrong
```

- **K-factor:** 32 for the student's first 30 rated questions in that subject
  (fast calibration), 16 afterwards (stability).
- **Floor:** rating never drops below 400.
- **Blank / unattempted questions: no rating change.** Skipping is a legitimate
  NEET strategy; blanks already cost marks and are caught by the
  TIME_MANAGEMENT diagnosis. No match played → no rating moved.

Worked examples (S = 1000, K = 32):

| Event | Δ |
|---|---|
| Correct on Hard (1400) | **+29** |
| Wrong on Hard (1400) | −3 |
| Correct on Easy (800) | +8 |
| Wrong on Easy (800) | **−24** |

### Overall rating (exam-weighted)

```
overall = 0.50 × Biology + 0.25 × Physics + 0.25 × Chemistry
```

Mirrors the real NEET marks split (360/180/180 of 720), so the overall number
honestly answers "how NEET-ready am I?". Recomputed after every subject update,
never updated directly.

### Anti-farming rule (repeat questions)

Practice mocks are generated from a finite pool, so a student will eventually
re-see questions. Rule: **if the student has previously answered this exact
question correctly, the rating change is 0** (you can't farm memorized
answers). If they previously got it wrong, the update applies normally —
getting it right the second time is real learning. Lookup: the student's past
`answers` rows joined through `attempts`.

---

## 3. Levels — "Road to the White Coat"

The rating maps to named bands. The top level is the student's actual life goal.

| Rating | Level | |
|---|---|---|
| < 900 | **Aspirant** | everyone starts here |
| 900–1049 | **Achiever** | first real wins |
| 1050–1199 | **Scholar** | knows the NCERT cold |
| 1200–1349 | **Ranker** | the word every centre worships |
| 1350–1499 | **Topper** | batch-topper territory |
| 1500+ | **White Coat** 🥼 | the coat ceremony, made visible |

- Levels exist **per subject and overall** ("Topper in Biology, Scholar in Physics").
- **Sticky with a 25-point buffer:** promote the moment the rating crosses a
  band's floor; demote only when it falls **25+ points below** that floor
  (e.g. a Ranker at 1205 who slips to 1198 stays Ranker; below 1175 they drop
  to Scholar). The rating itself is always honest — the level just doesn't
  flicker at boundaries.
- Mascot tie-in (later polish): Neuro wears the level — stethoscope at
  Scholar, white coat at the top.

---

## 4. What counts toward the rating

**Everything graded:** institute weekend mocks, full NEET practice mocks,
lesson practice, and climb sessions — same Elo update everywhere. Mocks are the
highest-quality signal; self-practice is the daily loop.

Updates are applied **server-side at submit time** (inside the `submitAttempt`
pipeline, after the attempt + answers are persisted), processing the answers in
test order. The client never computes or posts rating data.

---

## 5. Database shape

New migration `0011_ratings.sql`:

```
student_ratings
  student_id   uuid  → students(id) on delete cascade
  subject      text  check in ('Physics','Chemistry','Biology','Overall')
  rating       numeric not null default 1000
  level        text  not null default 'Aspirant'   -- stored, because stickiness depends on history
  questions_rated int not null default 0           -- drives the K-factor switch
  updated_at   timestamptz
  primary key (student_id, subject)

rating_events                                       -- the explainability ledger
  id           uuid pk
  attempt_id   uuid → attempts(id) on delete cascade
  question_id  uuid → questions(id)
  student_id   uuid → students(id)
  subject      text
  delta        numeric not null                     -- signed change, 0 for repeat-correct
  rating_after numeric not null
  created_at   timestamptz
  unique (attempt_id, question_id)                  -- idempotency: a resubmit can't double-apply
```

- `rating_events` powers "why did my rating move" and the home screen's recent
  deltas. ~180 rows per full mock — fine at pilot scale; prunable later.
- **RLS:** students read their own rows; teachers read rows for students in
  their centre; admin reads all. **All writes go through the service client
  only** (grading path) — no user-facing write policy at all.
- Question ratings are a constant map in code (`lib/rating.ts`) — no column.

---

## 6. Code shape

```
lib/rating.ts            pure Elo engine: question rating map, expected-score,
                         update step, K schedule, level bands + sticky logic.
                         Unit-tested like diagnose.ts (same style, same bar).
lib/db/ratings.ts        read/write layer: getRatings(studentId),
                         applyRatingUpdates(attemptId, gradedItems) — runs the
                         per-question loop + repeat-correct lookup + upserts.
app/actions.ts           submitAttempt(): after saveAttempt(), call
                         applyRatingUpdates(). Rating failure must NOT fail the
                         submission (log + continue) — grading is sacred.
```

---

## 7. Student home UI (the only surface in v1)

A level card on the student home (`HomeClient`), above the mock list:

```
┌─────────────────────────────────────────────┐
│  [Neuro]   SCHOLAR             1,142 ⬆ +24  │
│            ████████████░░░░░  58 to Ranker  │
│                                             │
│  Bio  Topper 1,380 · Phy  Scholar 1,120 ·   │
│  Chem Achiever 1,010                        │
└─────────────────────────────────────────────┘
```

- Overall level + rating, progress bar to the next band, recent delta
  (sum of `rating_events` from the latest attempt).
- Per-subject chips with their own level + rating.
- No leaderboard, no rank number, no comparison to other students in v1.

---

## 8. Explicitly out of scope for v1 (parked)

- **XP / streak "effort meter"** — separate always-up meter rewarding daily
  showing-up. Designed to coexist with the skill rating; build after v1 lands.
- Top-10 leaderboard / "students at your level in your centre" social counts.
- Diagnosis-modified gains (e.g. TOO_SLOW correct earning ×0.8).
- Question-rating calibration from real correct-rates.
- Rating display on the report page, teacher view, parent view.
- Backfilling ratings from historical attempts (decide at build time: start
  everyone fresh at 1000, or replay past `answers` chronologically — replay is
  feasible since the ledger design supports it).

---

## 9. Decision log

| Decision | Choice |
|---|---|
| Core metric | Per-question Elo vs question difficulty |
| Wrong answers | Visibly drop the rating, per question |
| Blank answers | No rating change |
| Per-subject + overall | Both; overall = 50% Bio / 25% Phy / 25% Chem |
| What counts | Institute mocks AND all self-practice, identically |
| Window | None — lifetime, sign-up to exam day |
| Presentation | Levels (Theme A "Road to the White Coat"), not ranks |
| Level demotion | Sticky with 25-point buffer |
| Surface | Student home only (v1) |
| Anti-farming | Zero delta on questions previously answered correctly |
