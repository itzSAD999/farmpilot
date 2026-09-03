-- ============================================================
-- Migration: 021_audio_bucket_listable
-- Description: storage.buckets and storage.objects are separate tables
-- with separate RLS. Migration 019 covered objects (read/write inside
-- the 'audio' bucket); this covers the buckets table itself, so
-- supabase-js's listBuckets()/getBucket() can actually see that 'audio'
-- exists instead of always returning an empty list to any non-owner
-- caller and making generate_khaya.ts think it needs to (re-)create it.
-- ============================================================

drop policy if exists audio_bucket_listable on storage.buckets;
create policy audio_bucket_listable on storage.buckets
  for select to authenticated
  using (id = 'audio');
