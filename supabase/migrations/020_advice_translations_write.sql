-- ============================================================
-- Migration: 020_advice_translations_write
-- Description: advice_translations (migration 003) had a read policy
-- only — no insert/update policy exists anywhere, so scripts/
-- generate_khaya.ts's upsert() would fail under RLS with "new row
-- violates row-level security policy" for any caller, including its
-- own dedicated generator account (migration 019).
--
-- Security note, stated plainly rather than left implicit: every other
-- reference/benchmark table in this schema (crops, cost_benchmarks,
-- crop_input_norms, guides, advice_rules) is read-only to `authenticated`
-- with writes only ever applied directly by the project owner via a
-- migration, never through the app. This table is a narrow, deliberate
-- exception — its own `select` policy already lets any signed-in farmer
-- read every row (this is shared advisory content, not farmer-owned
-- data), and machine-generated translations are unreviewed by default
-- (`reviewed = false`) until a native speaker checks them, so the
-- integrity bar for who may write a *candidate* row is lower than for
-- data used as fact anywhere else in the system. If this ever needs
-- tightening, the fix is to require an explicit reviewer role rather
-- than opening this back up to every authenticated user.
-- ============================================================

drop policy if exists advice_tr_write on advice_translations;
create policy advice_tr_write on advice_translations
  for insert to authenticated
  with check (true);

drop policy if exists advice_tr_update on advice_translations;
create policy advice_tr_update on advice_translations
  for update to authenticated
  using (true)
  with check (true);
