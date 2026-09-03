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

/**
 * Speaks English text aloud using the browser's own built-in
 * text-to-speech (the Web Speech API) — NOT Khaya. There is no
 * pre-generated English clip anywhere in this project, and there doesn't
 * need to be: unlike Twi, English speech synthesis is a standard browser
 * capability, free and available with no API call and no quota. This is
 * what makes the advice speaker button work symmetrically for a farmer
 * reading English, not just one reading Twi. Resolves to false (instead
 * of throwing) if the browser has no speech synthesis support at all —
 * rare, but real on some older or embedded browsers — so callers can
 * fail quietly the same way playAdviceAudio() does.
 */
export function speakEnglish(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis.cancel(); // don't stack overlapping reads
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[khaya] Speech synthesis failed:', err);
      resolve(false);
    }
  });
}

// ── Review support ──────────────────────────────────────────────
//
// The generation script (and every function above) can only ever set
// `reviewed = false` — that's enforced by never writing `true` anywhere
// in this codebase. Reviewing a translation for actual quality (is this
// natural, correct Twi a farmer would understand) is not something an AI
// coding assistant can do honestly; it requires a real Twi speaker to
// listen and judge. What follows is the tool that makes that a one-tap
// action once a real reviewer is available, instead of requiring someone
// to write raw SQL — see src/pages/ReviewTranslations.tsx.

export interface ReviewableTranslation {
  id: number;
  category: string;
  englishText: string;
  twiText: string;
  audioUrl: string | null;
  reviewed: boolean;
}

/** Every generated Twi translation, English source included, for a human reviewer to work through. */
export async function listTranslationsForReview(): Promise<ReviewableTranslation[]> {
  const { data, error } = await supabase
    .from('advice_translations')
    .select('id, message, audio_url, reviewed, advice_rules ( category, message )')
    .eq('language', 'tw')
    .order('advice_id');

  if (error) throw new Error('Failed to load translations for review: ' + error.message);

  return (data as any[]).map((row) => ({
    id: row.id,
    category: row.advice_rules?.category ?? 'unknown',
    englishText: row.advice_rules?.message ?? '',
    twiText: row.message,
    audioUrl: row.audio_url,
    reviewed: row.reviewed,
  }));
}

/**
 * The ONLY place in this codebase that may set reviewed = true — and it
 * only ever does so because a human reviewer clicked a button to say so,
 * never automatically. Also supports un-reviewing (correcting a mistake).
 */
export async function setTranslationReviewed(id: number, reviewed: boolean): Promise<void> {
  const { error } = await supabase
    .from('advice_translations')
    .update({ reviewed })
    .eq('id', id);

  if (error) throw new Error('Failed to update review status: ' + error.message);
}
