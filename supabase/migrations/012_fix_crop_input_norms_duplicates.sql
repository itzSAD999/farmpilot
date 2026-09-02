-- ============================================================
-- FarmPilot — Migration 012
-- Fixes: crop_input_norms had 5 duplicate rows per (crop_id,
-- benchmark_id) for every Maize input. Root cause: the unique
-- constraint crop_input_norms_crop_id_benchmark_id_season_window_key
-- is (crop_id, benchmark_id, season_window), and every seeded row has
-- season_window = NULL. Postgres UNIQUE constraints never treat two
-- NULLs as equal, so the constraint silently allowed an unlimited
-- number of "duplicate" rows whenever 002_seed_benchmarks.sql's
-- ON CONFLICT DO UPDATE was re-applied — it never matched, so it
-- always inserted a fresh row instead of updating the existing one.
--
-- This 5x'd every quantity_per_acre sum in generate_estimate(),
-- quick_fill_costs() and get_category_benchmark_pesewas() for Maize,
-- the only crop with seeded norms — every benchmark and "estimated
-- cost" figure in the app has been ~5x too high.
--
-- Fix:
--   1. De-duplicate existing rows, keeping the earliest of each set.
--   2. Replace the NULL-blind unique constraint with two PARTIAL
--      unique indexes — the standard Postgres pattern for "NULL
--      should still count as a comparable value" — one for rows with
--      a specific season_window, one for rows that apply to all
--      windows (season_window IS NULL).
-- ============================================================

-- 1. De-duplicate: keep the lowest id per (crop_id, benchmark_id, season_window),
-- treating NULL season_window as its own comparable group.
delete from crop_input_norms a
using crop_input_norms b
where a.id > b.id
  and a.crop_id = b.crop_id
  and a.benchmark_id = b.benchmark_id
  and coalesce(a.season_window::text, '') = coalesce(b.season_window::text, '');

alter table crop_input_norms drop constraint if exists crop_input_norms_crop_id_benchmark_id_season_window_key;

create unique index if not exists crop_input_norms_window_specific_key
  on crop_input_norms (crop_id, benchmark_id, season_window)
  where season_window is not null;

create unique index if not exists crop_input_norms_all_windows_key
  on crop_input_norms (crop_id, benchmark_id)
  where season_window is null;
