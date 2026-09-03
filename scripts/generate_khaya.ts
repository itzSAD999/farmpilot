/**
 * One-off generation script — run ONCE from the command line to
 * pre-generate Twi translations + audio for all 8 advice_rules
 * categories via Ghana NLP's Khaya AI API, and cache them in
 * advice_translations. NOT part of the app bundle; the app never calls
 * Khaya at runtime (see src/lib/khaya.ts, which only reads this cache).
 *
 * Usage:
 *   npx tsx scripts/generate_khaya.ts
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   KHAYA_API_KEY  (deliberately NOT prefixed VITE_ — that prefix tells
 *                   Vite "safe to bundle into the browser," and this key
 *                   must never reach client code. Same reasoning as
 *                   OPENROUTER_API_KEY elsewhere in this project, which
 *                   also only ever runs server-side/script-side.)
 *
 * Idempotent: skips any category that already has a reviewed=false-or-
 * true row with both a message and an audio_url — safe to re-run after
 * a partial failure without burning extra API quota (8 categories x
 * 1 translate + 1 TTS call = 16 calls at most per full run, against a
 * 100-call/month free-tier quota).
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;
const KHAYA_BASE = 'https://translation-api.ghananlp.org';
const TWI_SPEAKER = 'female';
const STORAGE_BUCKET = 'audio';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}
if (!KHAYA_API_KEY) {
  console.error(
    'Missing KHAYA_API_KEY in .env — this script cannot call the Khaya API without it.\n' +
    'Get a key from https://translation.ghananlp.org, add it to .env as\n' +
    'KHAYA_API_KEY=<key> (no VITE_ prefix — see the file header comment\n' +
    'for why), and re-run. Never commit this key.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Storage writes to the 'audio' bucket require an authenticated session
// (migration 019) — this project never grants the anon role write access
// anywhere, including here. This script signs in with a dedicated,
// low-privilege account that owns no farm data of its own; it exists
// solely to satisfy that check.
const GENERATOR_EMAIL = 'khaya-generator@farmpilot.internal';
const GENERATOR_PASSWORD = 'KhayaGenBot-2026-Internal!';

async function ensureSignedIn(): Promise<void> {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: GENERATOR_EMAIL,
    password: GENERATOR_PASSWORD,
  });
  if (!signInError) {
    console.log('  Signed in as the generator account.');
    return;
  }
  console.log('  Generator account does not exist yet — creating it...');
  const { error: signUpError } = await supabase.auth.signUp({
    email: GENERATOR_EMAIL,
    password: GENERATOR_PASSWORD,
  });
  if (signUpError) {
    throw new Error(`Could not sign in or create the generator account: ${signUpError.message}`);
  }
  console.log('  Generator account created and signed in.');
}

interface AdviceRule {
  id: number;
  category: string;
  message: string;
}

async function resolveTwiLanguageCode(): Promise<string> {
  console.log('[1/3] Confirming the Twi language code from /tts/v2/languages...');
  const res = await fetch(`${KHAYA_BASE}/tts/v2/languages`, {
    headers: { 'Ocp-Apim-Subscription-Key': KHAYA_API_KEY! },
  });
  if (!res.ok) {
    throw new Error(`GET /tts/v2/languages failed: ${res.status} ${await res.text()}`);
  }
  // Response shape confirmed live: { "languages": { "<Display Name>": "<code>", ... } }
  // NOT a flat array — do not assume otherwise.
  const body = (await res.json()) as { languages: Record<string, string> };
  console.log('  Available languages:', body.languages);

  // The API distinguishes two real Twi dialects — there is no plain "tw".
  // "Asante Twi" ("twi") is used here because the seeded demonstration
  // farmer (Kwame Mensah, docs/FarmPilot_MiniProject_Report.md Appendix D)
  // farms in Ejisu, Ashanti Region, where Asante Twi is the dialect
  // actually spoken — not a guess, but still machine-generated audio, so
  // the native-speaker review step (reviewed=false by default) still
  // applies. If a reviewer says Akuapem Twi ("atw") is the better fit for
  // your actual audience, change ASANTE_TWI_CODE below and re-run.
  const ASANTE_TWI_CODE = 'twi';
  if (!Object.values(body.languages).includes(ASANTE_TWI_CODE)) {
    throw new Error(
      `Expected Twi code "${ASANTE_TWI_CODE}" not found in the live languages list: ` +
      `${JSON.stringify(body.languages)}. The API may have changed its codes — update ` +
      `ASANTE_TWI_CODE in resolveTwiLanguageCode() before proceeding.`
    );
  }
  console.log(`  Using "Asante Twi" -> code "${ASANTE_TWI_CODE}" (Akuapem Twi "atw" is the alternative).`);
  return ASANTE_TWI_CODE;
}

async function translateToTwi(englishText: string, twiCode: string): Promise<string> {
  const res = await fetch(`${KHAYA_BASE}/v2/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': KHAYA_API_KEY!,
    },
    body: JSON.stringify({ in: englishText, lang: `en-${twiCode}` }),
  });
  if (!res.ok) {
    throw new Error(`POST /v2/translate failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  // The Khaya translate response shape has varied across versions —
  // handle the common cases rather than assuming one.
  const translated = typeof data === 'string' ? data : data.translation ?? data.out ?? data.text;
  if (!translated) {
    throw new Error(`Unexpected /v2/translate response shape: ${JSON.stringify(data)}`);
  }
  return translated;
}

async function synthesizeSpeech(twiText: string, twiCode: string): Promise<Buffer> {
  const res = await fetch(`${KHAYA_BASE}/tts/v2/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': KHAYA_API_KEY!,
    },
    body: JSON.stringify({ text: twiText, language: twiCode, speaker_id: TWI_SPEAKER }),
  });
  if (!res.ok) {
    throw new Error(`POST /tts/v2/synthesize failed: ${res.status} ${await res.text()}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function ensureBucketExists(): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.warn(`  Could not list Storage buckets (${error.message}) — assuming "${STORAGE_BUCKET}" already exists.`);
    return;
  }
  if (buckets?.some((b) => b.name === STORAGE_BUCKET)) {
    console.log(`  Storage bucket "${STORAGE_BUCKET}" already exists.`);
    return;
  }
  console.log(`  Storage bucket "${STORAGE_BUCKET}" not visible to listBuckets() — attempting to create it (public read)...`);
  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
  if (createError) {
    // Not necessarily fatal: the bucket may genuinely already exist but
    // be invisible to listBuckets() under this session (a storage.buckets
    // RLS gap, not a storage.objects one — see migration 021). Warn and
    // let the first real upload attempt be the actual test.
    console.warn(
      `  Could not create "${STORAGE_BUCKET}" (${createError.message}). Continuing — ` +
      `if it genuinely doesn't exist yet, the first upload below will fail clearly instead.`
    );
    return;
  }
  console.log(`  Created "${STORAGE_BUCKET}" bucket.`);
}

async function uploadAudio(category: string, audioBuffer: Buffer): Promise<string> {
  // Confirmed live (Step 1 verification, run against the real API before
  // this script was written): /tts/v2/synthesize returns audio/wav, not
  // mp3 as originally assumed — RIFF/WAVE, mono 16kHz.
  const path = `advice/${category}/tw.wav`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, audioBuffer, { contentType: 'audio/wav', upsert: true });
  if (error) {
    throw new Error(`Storage upload failed for ${path}: ${error.message}`);
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function main() {
  console.log('=== Khaya AI generation script — Twi advice text + audio ===\n');

  const twiCode = await resolveTwiLanguageCode();

  console.log('\n[2/3] Signing in and ensuring the Storage bucket exists...');
  await ensureSignedIn();
  await ensureBucketExists();

  console.log('\n[3/3] Processing each advice_rules category...\n');
  const { data: rules, error: rulesError } = await supabase
    .from('advice_rules')
    .select('id, category, message')
    .order('category');
  if (rulesError || !rules) {
    console.error('Could not load advice_rules:', rulesError?.message);
    process.exit(1);
  }
  console.log(`Found ${rules.length} advice_rules rows to process.\n`);

  const failures: { category: string; error: string }[] = [];

  for (const rule of rules as AdviceRule[]) {
    console.log(`--- ${rule.category} ---`);
    try {
      // Idempotency: skip if a complete row (text + audio) already exists.
      const { data: existing } = await supabase
        .from('advice_translations')
        .select('id, message, audio_url')
        .eq('advice_id', rule.id)
        .eq('language', 'tw')
        .maybeSingle();

      if (existing?.message && existing?.audio_url) {
        console.log(`  Already generated (id=${existing.id}) — skipping.`);
        continue;
      }

      console.log('  Translating English -> Twi...');
      const twiText = await translateToTwi(rule.message, twiCode);
      console.log(`  Translated: "${twiText.slice(0, 60)}${twiText.length > 60 ? '...' : ''}"`);

      console.log('  Synthesizing speech...');
      const audioBuffer = await synthesizeSpeech(twiText, twiCode);
      console.log(`  Got ${audioBuffer.length} bytes of audio.`);

      console.log('  Uploading to Storage...');
      const audioUrl = await uploadAudio(rule.category, audioBuffer);
      console.log(`  Uploaded: ${audioUrl}`);

      console.log('  Upserting into advice_translations...');
      const { error: upsertError } = await supabase
        .from('advice_translations')
        .upsert(
          {
            advice_id: rule.id,
            language: 'tw',
            message: twiText,
            audio_url: audioUrl,
            source: 'khaya_tts_v2',
            reviewed: false, // NEVER set true automatically — a native speaker must review and flip this by hand.
          },
          { onConflict: 'advice_id,language' }
        );
      if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);

      console.log(`  Done: ${rule.category}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${rule.category} — ${message}\n`);
      failures.push({ category: rule.category, error: message });
    }
  }

  console.log('=== Summary ===');
  console.log(`${rules.length - failures.length}/${rules.length} categories succeeded.`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  - ${f.category}: ${f.error}`);
    }
    console.log(
      '\nAll generated rows have reviewed=false. Before demo, a Twi speaker ' +
      'must listen to each clip and set reviewed=true by hand for the ones ' +
      'that are correct — this script never does that automatically.'
    );
    process.exit(1);
  }

  console.log(
    '\nAll categories generated. reviewed=false on every row — a native ' +
    'Twi speaker must listen and set reviewed=true by hand before demo.'
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
