-- ============================================================
-- Migration: 018_advice_audio_url
-- Description: Adds audio_url to advice_translations so a pre-generated
-- Twi voice clip (Ghana NLP's Khaya TTS API, run once via
-- scripts/generate_khaya.ts, never at runtime) can be cached alongside
-- the translated text. Nullable — a translation can exist as text only,
-- before or without an audio clip.
-- ============================================================

alter table advice_translations
  add column if not exists audio_url text;

comment on column advice_translations.audio_url is
  'Public Supabase Storage URL for a pre-generated TTS clip of `message`. '
  'Generated once by scripts/generate_khaya.ts, never at request time. '
  'Null until generated; the UI hides the play button when null rather '
  'than showing a broken control.';
