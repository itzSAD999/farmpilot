import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGuideById } from '../api/guides';
import { CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';
import { useState } from 'react';
import { useFarm } from '../hooks/useFarm';
import { generatePersonalizedGuide } from '../api/ai';

export function GuideDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { farm } = useFarm();
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [personalizedPlan, setPersonalizedPlan] = useState<string | null>(null);

  const { data: guide, isLoading, isError } = useQuery({
    queryKey: ['guide', id],
    queryFn: () => getGuideById(Number(id)),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (isError || !guide) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Guide not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 font-bold">Go back</button>
      </div>
    );
  }

  const readableCategory = CATEGORIES[guide.category as CostCategory]?.label || guide.category;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] pb-24">
      {/* Header Area */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-white/10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
              {readableCategory}
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-4">
            {guide.title}
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
            {guide.summary}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Personalize Button */}
        {farm && (
          <div className="mb-10 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/30 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">Want this tailored to your farm?</h3>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm mt-1">
                FarmPilot AI can adapt this guide specifically for your {Number(farm.total_area_acres || 0)} acres in {String(farm.district || 'your region')}.
              </p>
            </div>
            <button
              onClick={async () => {
                if (isPersonalizing || personalizedPlan) return;
                setIsPersonalizing(true);
                try {
                  const plan = await generatePersonalizedGuide(
                    guide.title,
                    guide.summary,
                    guide.body_markdown,
                    farm
                  );
                  setPersonalizedPlan(plan);
                } catch (e) {
                  setPersonalizedPlan("Sorry, there was an error generating your personalized plan.");
                } finally {
                  setIsPersonalizing(false);
                }
              }}
              disabled={isPersonalizing || !!personalizedPlan}
              className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {isPersonalizing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Personalizing...
                </>
              ) : personalizedPlan ? (
                'Personalized Below'
              ) : (
                'Personalize Now'
              )}
            </button>
          </div>
        )}

        {/* Personalized Plan Display */}
        {personalizedPlan && (
          <div className="mb-12 bg-white dark:bg-[#1a1a1a] rounded-3xl p-8 shadow-xl border-2 border-emerald-500 relative animate-fade-in-up">
            <div className="absolute -top-4 left-8 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              Your Personalized Plan
            </div>
            <div className="prose prose-emerald dark:prose-invert max-w-none mt-2">
              {personalizedPlan.split('\n').map((line, i) => {
                if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-emerald-800 dark:text-emerald-300">{line.replace('### ', '')}</h3>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-emerald-900 dark:text-emerald-200">{line.replace('## ', '')}</h2>;
                if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.replace('# ', '')}</h1>;
                if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-1 text-gray-700 dark:text-gray-300">{line.substring(2)}</li>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{line}</p>;
              })}
            </div>
          </div>
        )}

        {/* Steps */}
        {guide.guide_steps && guide.guide_steps.length > 0 && !personalizedPlan && (
          <div className="mb-12 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-emerald-600 dark:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Action Plan
            </h2>
            {guide.guide_steps.map((step, index) => (
              <div key={step.id} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">{step.heading}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Body Markdown (simulated as simple text with basic formatting for now since we don't have a markdown parser installed) */}
        <div className="prose prose-emerald dark:prose-invert prose-lg max-w-none mb-12">
          {guide.body_markdown.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed">{paragraph}</p>
          ))}
        </div>

        {/* Source citation */}
        <div className="bg-gray-100 dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Source Information</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{guide.source}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
