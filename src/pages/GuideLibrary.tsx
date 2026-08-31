import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listGuides, getFlaggedCategoriesForFarm } from '../api/guides';
import { useFarm } from '../hooks/useFarm';
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

  const forYourFarmGuides = guides?.filter(g => flaggedCategories?.includes(g.category));
  const libraryGuides = guides?.filter(g => !flaggedCategories?.includes(g.category));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Guidance Library</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Best practices and cost-saving advice for your farm.</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search guides..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="w-full sm:w-48 px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
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

      {/* General Library Section */}
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
          <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-[24px] border border-gray-100 dark:border-white/5">
            <p className="text-gray-500 dark:text-gray-400">No guides found matching your filters.</p>
          </div>
        )}
      </div>
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
          ? 'bg-[#fff8f1] dark:bg-[#2a1a10] border-orange-200 dark:border-orange-900/50 hover:border-orange-300 dark:hover:border-orange-700' 
          : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-700/50'
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
