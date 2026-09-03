import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTranslationsForReview, setTranslationReviewed, playAdviceAudio } from '../lib/khaya';
import { CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';
import { useState } from 'react';

/**
 * Not linked anywhere in the app's navigation — reachable only by
 * knowing this URL (/review-translations). This is deliberately a
 * reviewer's tool, not a farmer-facing feature: it exists so that
 * confirming a machine-generated Twi translation is accurate takes one
 * click from a real Twi speaker, instead of requiring raw SQL. See
 * src/lib/khaya.ts's "Review support" section and
 * FarmPilot_Development_Log.md, Issue #41, for why this exists and what
 * it deliberately does not do (it cannot judge translation quality
 * itself — only a human listening can).
 */
export function ReviewTranslations() {
  const queryClient = useQueryClient();
  const [playingId, setPlayingId] = useState<number | null>(null);

  const { data: translations, isLoading } = useQuery({
    queryKey: ['translationsForReview'],
    queryFn: listTranslationsForReview,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, reviewed }: { id: number; reviewed: boolean }) => setTranslationReviewed(id, reviewed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['translationsForReview'] }),
  });

  const handlePlay = async (id: number, audioUrl: string) => {
    setPlayingId(id);
    await playAdviceAudio(audioUrl);
    setPlayingId(null);
  };

  if (isLoading) {
    return <div className="max-w-3xl mx-auto py-12 px-6 text-center text-gray-500">Loading translations...</div>;
  }

  const reviewedCount = translations?.filter((t) => t.reviewed).length ?? 0;
  const total = translations?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 pb-24">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Review Twi Translations</h1>
      <p className="text-gray-500 font-medium mb-2">
        Listen to each clip and confirm the Twi text is natural and correct before it's presented as reviewed anywhere in the app.
      </p>
      <p className="text-sm font-bold text-emerald-700 mb-8">{reviewedCount} of {total} reviewed</p>

      <div className="space-y-4">
        {translations?.map((t) => {
          const label = CATEGORIES[t.category as CostCategory]?.label || t.category;
          return (
            <div key={t.id} className={`bg-white rounded-2xl border p-5 ${t.reviewed ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-lg font-bold text-gray-900">{label}</h2>
                {t.reviewed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Reviewed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full shrink-0">
                    Not yet reviewed
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-2"><span className="font-bold text-gray-700">English:</span> {t.englishText}</p>
              <p className="text-sm text-gray-900 font-medium mb-4"><span className="font-bold text-gray-700">Twi:</span> {t.twiText}</p>

              <div className="flex items-center gap-3">
                {t.audioUrl && (
                  <button
                    onClick={() => handlePlay(t.id, t.audioUrl!)}
                    disabled={playingId === t.id}
                    className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    {playingId === t.id ? 'Playing...' : 'Play audio'}
                  </button>
                )}
                <button
                  onClick={() => reviewMutation.mutate({ id: t.id, reviewed: !t.reviewed })}
                  disabled={reviewMutation.isPending}
                  className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ${
                    t.reviewed
                      ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                      : 'text-white bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {t.reviewed ? 'Mark as not reviewed' : 'Confirm this is accurate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
