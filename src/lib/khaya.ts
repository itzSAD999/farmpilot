import { supabase } from './supabase';

/**
 * Runtime-only reader for pre-generated Twi advice text and audio.
 * NEVER calls the Khaya API — that happens exactly once, offline, via
 * scripts/generate_khaya.ts. This module only reads what that script
 * already cached in `advice_translations` (migration 003 + 018).
 */

export interface AdviceTranslation {
  /** Twi text if a translation exists, otherwise the original English advice. */
  text: string;
  /** Public Storage URL for the pre-generated TTS clip, or null if none exists yet. */
  audioUrl: string | null;
  /** True only once a native speaker has listened and confirmed the translation (never set by the generation script). */
  reviewed: boolean;
}

/**
 * Looks up the cached Twi translation + audio for one advice category.
 * Falls back to the English advice_rules text — silently, with no error
 * and no network call — if no translation has been generated yet.
 */
export async function getTwiAdvice(category: string): Promise<AdviceTranslation> {
  const { data: rule, error: ruleError } = await supabase
    .from('advice_rules')
    .select('id, message')
    .eq('category', category)
    .single();

  if (ruleError || !rule) {
    // Nothing to fall back to either — treat as an empty, unreviewed
    // English-less result rather than throwing (advice is supplementary,
    // never something that should break the page it's shown on).
    return { text: '', audioUrl: null, reviewed: false };
  }

  const { data: translation } = await supabase
    .from('advice_translations')
    .select('message, audio_url, reviewed')
    .eq('advice_id', rule.id)
    .eq('language', 'tw')
    .maybeSingle();

  if (!translation) {
    return { text: rule.message, audioUrl: null, reviewed: false };
  }

  return {
    text: translation.message,
    audioUrl: translation.audio_url,
    reviewed: translation.reviewed,
  };
}

/**
 * Plays a pre-generated advice clip. Never throws — if the browser
 * blocks autoplay (common on mobile without a prior user gesture, though
 * this is always called from a tap so it should rarely trigger), the
 * returned promise resolves to false so the caller can show a manual
 * play control instead of a silently-broken button.
 */
export async function playAdviceAudio(audioUrl: string): Promise<boolean> {
  try {
    const audio = new Audio(audioUrl);
    await audio.play();
    return true;
  } catch (err) {
    console.warn('[khaya] Audio playback blocked or failed:', err);
    return false;
  }
}
