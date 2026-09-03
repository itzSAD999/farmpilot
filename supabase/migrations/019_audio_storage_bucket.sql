-- ============================================================
-- Migration: 019_audio_storage_bucket
-- Description: Creates the 'audio' Storage bucket for pre-generated
-- Twi advice clips (scripts/generate_khaya.ts) and its RLS policies.
-- Public read (the app fetches clips directly by URL, unauthenticated,
-- exactly like any other public asset); writes restricted to signed-in
-- users only — the generation script signs in with a dedicated account
-- rather than running fully anonymous, matching this project's standing
-- rule that anon never gets write access anywhere (§4.2, SDD §5).
-- Run directly (not via the Dashboard) because the CLI's linked session
-- has owner privileges the anon key does not — bucket creation and
-- storage.objects policies both fail under RLS with the anon key alone.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do nothing;

drop policy if exists audio_public_read on storage.objects;
create policy audio_public_read on storage.objects
  for select
  using (bucket_id = 'audio');

drop policy if exists audio_authenticated_write on storage.objects;
create policy audio_authenticated_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audio');

drop policy if exists audio_authenticated_update on storage.objects;
create policy audio_authenticated_update on storage.objects
  for update to authenticated
  using (bucket_id = 'audio')
  with check (bucket_id = 'audio');
