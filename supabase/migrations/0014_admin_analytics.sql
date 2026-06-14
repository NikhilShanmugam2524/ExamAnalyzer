-- DriveScore — Platform admin analytics (read-only rollups)
--
-- Powers the operations dashboard at /admin. These are pure read-only
-- aggregations over EXISTING data — no new columns, no new data collection.
-- The admin role reads them through the SERVICE key (bypasses RLS), exactly
-- like the rest of lib/db/admin.ts, so no per-row policy is needed here.
--
-- Attribution note: attempts carry no centre_id, so a centre's activity is
-- derived by joining attempts -> students -> students.centre_id (membership is
-- centre-based since 0013; batches are retired from visibility).
--
-- Security: these views are NOT granted to anon/authenticated, so they add no
-- new surface for teacher/student roles — only the service key can read them.
-- The defensive REVOKEs below make that explicit.
--
-- Idempotent / re-runnable.

-- ── Per-centre health: the churn radar ─────────────────────────────────────
-- One row per centre with the headline rollups. "active_students" = students
-- who have submitted at least one attempt; "last_activity" = the most recent
-- submitted attempt by anyone in the centre (the status signal).
create or replace view admin_centre_health as
select
  c.id                                          as centre_id,
  c.name                                        as name,
  c.created_at                                  as created_at,
  c.join_code                                   as join_code,
  coalesce(st.student_count, 0)                 as student_count,
  coalesce(st.students_with_login, 0)           as students_with_login,
  coalesce(act.active_students, 0)              as active_students,
  coalesce(q.question_count, 0)                 as question_count,
  coalesce(m.institute_mock_count, 0)           as institute_mock_count,
  coalesce(m.published_mock_count, 0)           as published_mock_count,
  m.last_mock_created_at                        as last_mock_created_at,
  coalesce(act.attempts_30d, 0)                 as attempts_30d,
  coalesce(act.attempts_7d, 0)                  as attempts_7d,
  act.last_activity                             as last_activity
from centres c
left join (
  select centre_id,
         count(*)            as student_count,
         count(profile_id)   as students_with_login
  from students
  group by centre_id
) st on st.centre_id = c.id
left join (
  select centre_id,
         count(*) as question_count
  from questions
  where centre_id is not null
  group by centre_id
) q on q.centre_id = c.id
left join (
  select centre_id,
         count(*) filter (where kind = 'institute')                          as institute_mock_count,
         count(*) filter (where kind = 'institute' and status = 'published') as published_mock_count,
         max(created_at) filter (where kind = 'institute')                   as last_mock_created_at
  from mocks
  where centre_id is not null
  group by centre_id
) m on m.centre_id = c.id
left join (
  select s.centre_id,
         count(distinct a.student_id)                                              as active_students,
         count(*) filter (where a.submitted_at >= now() - interval '30 days')      as attempts_30d,
         count(*) filter (where a.submitted_at >= now() - interval '7 days')       as attempts_7d,
         max(a.submitted_at)                                                       as last_activity
  from attempts a
  join students s on s.id = a.student_id
  where a.submitted_at is not null
  group by s.centre_id
) act on act.centre_id = c.id;

-- ── Platform momentum: attempts per ISO week (last ~12 weeks) ───────────────
create or replace view admin_weekly_attempts as
select date_trunc('week', submitted_at) as week_start,
       count(*)                         as attempts
from attempts
where submitted_at is not null
  and submitted_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1
order by 1;

-- ── Growth: new students per ISO week (last ~12 weeks) ──────────────────────
create or replace view admin_weekly_students as
select date_trunc('week', created_at) as week_start,
       count(*)                        as new_students
from students
where created_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1
order by 1;

-- Keep these admin-only: never expose to the public API roles.
revoke all on admin_centre_health   from anon, authenticated;
revoke all on admin_weekly_attempts from anon, authenticated;
revoke all on admin_weekly_students from anon, authenticated;
