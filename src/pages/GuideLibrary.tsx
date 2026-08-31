import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listGuides, getFlaggedCategoriesForFarm } from '../api/guides';
import { useFarm } from '../hooks/useFarm';
import { listSeasons } from '../api/seasons';
import { CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';

export function GuideLibrary() {
  const { farm } = useFarm();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data: guides, isLoading } = useQuery({
    queryKey: ['guides', selectedCategory, search],
    queryFn: () => listGuides({
      category: selectedCategory as any || undefined,
      search: search || undefined
    }),
  });

  const { data: flaggedCategories } = useQuery({
    queryKey: ['flaggedCategoriesForFarm', farm?.id],
    queryFn: () => getFlaggedCategoriesForFarm(farm!.id as number),
    enabled: !!farm?.id,
  });

  // Load seasons to determine user state for onboarding
  const { data: seasons } = useQuery({
    queryKey: ['seasons', farm?.id],
    queryFn: () => listSeasons(farm!.id as number),
    enabled: !!farm?.id,
  });

  const forYourFarmGuides = guides?.filter(g => flaggedCategories?.includes(g.category));
  const libraryGuides = guides?.filter(g => !flaggedCategories?.includes(g.category));

  const hasSeasons = seasons && seasons.length > 0;
  const hasCosts = seasons?.some(s => s.total_cost_pesewas > 0);
  const hasEstimates = seasons?.some(s => s.has_estimate);
  const hasGuides = guides && guides.length > 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-24 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Guidance Library</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Best practices and cost-saving advice for your farm.</p>
      </div>

      {/* Your Farm Progress — always show */}
      <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] rounded-[24px] p-6 sm:p-8 mb-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 className="text-lg font-bold">Your Farm Journey</h2>
          </div>
          <p className="text-white/60 text-sm mb-6">
            {hasEstimates 
              ? "Great progress! You're tracking costs and getting insights. Check your personalized recommendations below."
              : "Complete these steps to unlock personalized cost-saving guidance for your farm."
            }
          </p>
          
          {/* Progress Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <StepCard 
              step={1} 
              title="Set Up Farm" 
              done={true}
              description="Farm profile created"
              actionLink="/"
            />
            <StepCard 
              step={2} 
              title="Add a Season" 
              done={!!hasSeasons}
              description={hasSeasons ? `${seasons!.length} season${seasons!.length > 1 ? 's' : ''} tracked` : "Create your first crop season"}
              actionLink="/season/new"
              actionLabel="Add Season"
            />
            <StepCard 
              step={3} 
              title="Record Costs" 
              done={!!hasCosts}
              description={hasCosts ? "Costs being tracked" : "Log expenses for a season"}
              actionLink={hasSeasons ? `/season/${seasons![0].id}` : undefined}
              actionLabel="Record Cost"
            />
            <StepCard 
              step={4} 
              title="Get Insights" 
              done={!!hasEstimates}
              description={hasEstimates ? "Estimates generated!" : "Generate your first report"}
              actionLink={hasCosts ? `/season/${seasons!.find(s => s.total_cost_pesewas > 0)?.id}` : undefined}
              actionLabel="Generate"
            />
          </div>
        </div>
      </div>

      {/* Search and Filter — always show */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search guides..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="w-full sm:w-48 px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORIES).filter(([k]) => k !== 'other').map(([k, c]) => (
            <option key={k} value={k}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* For Your Farm Section */}
      {!search && !selectedCategory && forYourFarmGuides && forYourFarmGuides.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">For Your Farm</h2>
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800/50">
              Needs Attention
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forYourFarmGuides.map(guide => (
              <GuideCard key={guide.id} guide={guide} isUrgent />
            ))}
          </div>
        </div>
      )}

      {/* Quick Tips — show when no guides in DB */}
      {!hasGuides && !search && !selectedCategory && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TipCard 
              emoji="🌱" 
              title="Buy Seeds Early" 
              description="Certified seeds bought early in the season cost 20-30% less than last-minute purchases from local retailers."
              category="seeds"
            />
            <TipCard 
              emoji="🧪" 
              title="Government Fertiliser Subsidy" 
              description="The fertiliser subsidy roughly halves the cost of NPK and Urea. Don't miss the subsidy window — it's the most common avoidable overspend."
              category="fertiliser"
            />
            <TipCard 
              emoji="🚜" 
              title="Pool Land Preparation" 
              description="Coordinate with neighbouring farms to share tractor hire. Group bookings can reduce land prep costs by 15-25% per acre."
              category="land_prep"
            />
            <TipCard 
              emoji="👷" 
              title="Track Labour by Task" 
              description="Record labour costs per task (planting, weeding, harvesting) so you can see exactly where labour spend is highest."
              category="labour"
            />
            <TipCard 
              emoji="🧴" 
              title="Spray Calendar" 
              description="Follow a spray calendar from your local MoFA extension officer. Preventive spraying is cheaper than reactive treatment."
              category="agrochem"
            />
            <TipCard 
              emoji="📦" 
              title="Proper Storage Saves Money" 
              description="Proper drying and storage can prevent 10-20% post-harvest losses. Invest in good sacks and dry storage."
              category="storage"
            />
          </div>
        </div>
      )}

      {/* General Library Section */}
      {hasGuides && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {search || selectedCategory ? 'Search Results' : 'All Guides'}
          </h2>
          {libraryGuides && libraryGuides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {libraryGuides.map(guide => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10">
              <p className="text-gray-500 dark:text-gray-400">No guides found matching your filters.</p>
              <button 
                onClick={() => { setSearch(''); setSelectedCategory(''); }}
                className="mt-3 text-sm font-bold text-emerald-600 hover:text-emerald-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepCard({ step, title, done, description, actionLink, actionLabel }: {
  step: number;
  title: string;
  done: boolean;
  description: string;
  actionLink?: string;
  actionLabel?: string;
}) {
  return (
    <div className={`rounded-xl p-4 border transition-all ${
      done 
        ? 'bg-emerald-500/10 border-emerald-500/30' 
        : 'bg-white/5 border-white/10'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {done ? (
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
        ) : (
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
            {step}
          </div>
        )}
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="text-xs text-white/50 mb-3">{description}</p>
      {!done && actionLink && (
        <Link 
          to={actionLink} 
          className="inline-flex items-center text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {actionLabel || 'Get Started'} 
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </Link>
      )}
    </div>
  );
}

function TipCard({ emoji, title, description, category }: {
  emoji: string;
  title: string;
  description: string;
  category: string;
}) {
  const categoryConfig = CATEGORIES[category as CostCategory];
  return (
    <div className="bg-white dark:bg-white/5 rounded-[24px] p-6 border border-gray-100 dark:border-white/10 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <span className="text-3xl">{emoji}</span>
        {categoryConfig && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            {categoryConfig.label}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{description}</p>
    </div>
  );
}

function GuideCard({ guide, isUrgent = false }: { guide: any, isUrgent?: boolean }) {
  const readableCategory = CATEGORIES[guide.category as CostCategory]?.label || guide.category;
  
  return (
    <Link 
      to={`/guides/${guide.id}`}
      className={`block rounded-[24px] p-6 border transition-all hover:shadow-md group ${
        isUrgent 
          ? 'bg-[#fff8f1] dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50 hover:border-orange-300 dark:hover:border-orange-700' 
          : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-700/50'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
          isUrgent
            ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
        }`}>
          {readableCategory}
        </span>
      </div>
      <h3 className={`text-xl font-bold mb-2 tracking-tight ${isUrgent ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-gray-100'}`}>
        {guide.title}
      </h3>
      <p className={`text-sm font-medium mb-6 line-clamp-3 ${isUrgent ? 'text-orange-800/80 dark:text-orange-200/80' : 'text-gray-500 dark:text-gray-400'}`}>
        {guide.summary}
      </p>
      
      <div className={`mt-auto flex items-center font-bold text-sm transition-colors ${
        isUrgent 
          ? 'text-orange-600 dark:text-orange-500 group-hover:text-orange-700 dark:group-hover:text-orange-400' 
          : 'text-emerald-600 dark:text-emerald-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
      }`}>
        Read Guide
        <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </div>
    </Link>
  );
}
