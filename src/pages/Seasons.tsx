import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFarm } from '../hooks/useFarm';
import { listSeasonsFiltered, getSeasonFilterOptions, SeasonsFilter } from '../api/seasons';
import { Money } from '../components/ui/Money';

export function Seasons() {
  const { farm, isLoading: isLoadingFarm } = useFarm();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Parse filters from URL
  const filters: SeasonsFilter = useMemo(() => {
    const cropIds = searchParams.getAll('crop').map(Number).filter(n => !isNaN(n));
    const years = searchParams.getAll('year').map(Number).filter(n => !isNaN(n));
    const windows = searchParams.getAll('window') as NonNullable<SeasonsFilter['windows']>;
    const status = searchParams.get('status') as SeasonsFilter['status'] || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') as SeasonsFilter['sortBy']) || 'year';
    const sortDir = (searchParams.get('sortDir') as SeasonsFilter['sortDir']) || 'desc';

    return {
      search,
      cropIds: cropIds.length > 0 ? cropIds : undefined,
      years: years.length > 0 ? years : undefined,
      windows: windows.length > 0 ? windows : undefined,
      status,
      sortBy,
      sortDir
    };
  }, [searchParams]);

  // Query filter options
  const { data: filterOptions, isLoading: isLoadingOptions } = useQuery({
    queryKey: ['seasonOptions', farm?.id],
    queryFn: () => getSeasonFilterOptions(farm!.id as number),
    enabled: !!farm?.id,
  });

  // Query filtered seasons
  const { data: seasons, isLoading: isLoadingSeasons } = useQuery({
    queryKey: ['seasonsFiltered', farm?.id, filters],
    queryFn: () => listSeasonsFiltered(farm!.id as number, filters),
    enabled: !!farm?.id,
  });

  // Helper to update filters
  const updateFilter = (key: string, value: string | null, multi: boolean = false) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (multi) {
      if (value === null) {
        newParams.delete(key);
      } else {
        const current = newParams.getAll(key);
        if (current.includes(value)) {
          const filtered = current.filter(v => v !== value);
          newParams.delete(key);
          filtered.forEach(v => newParams.append(key, v));
        } else {
          newParams.append(key, value);
        }
      }
    } else {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size < 4) next.add(id);
    }
    setSelectedIds(next);
  };

  const isLoading = isLoadingFarm || isLoadingOptions || isLoadingSeasons;

  // Active filter count (excluding sort)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.cropIds) count += filters.cropIds.length;
    if (filters.years) count += filters.years.length;
    if (filters.windows) count += filters.windows.length;
    if (filters.status) count++;
    return count;
  }, [filters]);

  if (isLoading && !seasons) {
    return (
      <div className="pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded-lg mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-white/10 rounded-xl mt-4 sm:mt-0"></div>
        </div>
        
        {/* Filter Bar Skeleton */}
        <div className="h-16 w-full bg-gray-200 dark:bg-white/10 rounded-[20px] mb-6"></div>
        
        {/* List Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 w-full bg-gray-200 dark:bg-white/10 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Determine empty states
  const hasNoSeasonsAtAll = !isLoading && filterOptions?.crops.length === 0 && filterOptions?.years.length === 0;
  const hasNoMatches = !isLoading && (!seasons || seasons.length === 0) && !hasNoSeasonsAtAll;

  return (
    <div className="animate-fade-in-up pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0 pt-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Seasons</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Manage and compare your growing seasons.</p>
        </div>
        <Link to="/season/new" className="bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 outline-none">
          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          New Season
        </Link>
      </div>

      {hasNoSeasonsAtAll ? (
        <div className="bg-white dark:bg-white/5 rounded-[24px] p-12 border border-gray-100 dark:border-white/10 text-center shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No seasons yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">Start tracking your first growing season to monitor costs, estimate harvests, and compare performance.</p>
          <Link to="/season/new" className="inline-flex items-center bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 outline-none">
            Add Your First Season
          </Link>
        </div>
      ) : (
        <>
          {/* Filter Bar (Desktop) & Mobile Toggle */}
          <div className="bg-white dark:bg-white/5 rounded-[20px] p-4 border border-gray-100 dark:border-white/10 mb-6 shadow-sm flex flex-col xl:flex-row gap-4 xl:items-center">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search crop or season..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value || null)}
                className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl text-sm w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setIsFilterSheetOpen(true)}
              className="xl:hidden flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 w-full focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters {activeFilterCount > 0 && <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs">{activeFilterCount}</span>}
            </button>

            {/* Desktop Filters */}
            <div className="hidden xl:flex items-center gap-3 flex-wrap flex-1 justify-end">
              
              {/* Crop Filter */}
              <div className="relative group">
                <select 
                  onChange={(e) => updateFilter('crop', e.target.value, true)}
                  value=""
                  className="py-2 pl-3 pr-8 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="" disabled>+ Crop</option>
                  {filterOptions?.crops.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              {/* Year Filter */}
              <div className="relative group">
                <select 
                  onChange={(e) => updateFilter('year', e.target.value, true)}
                  value=""
                  className="py-2 pl-3 pr-8 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="" disabled>+ Year</option>
                  {filterOptions?.years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              {/* Window Filter */}
              <div className="relative group">
                <select 
                  onChange={(e) => updateFilter('window', e.target.value, true)}
                  value=""
                  className="py-2 pl-3 pr-8 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="" disabled>+ Window</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="dry">Dry</option>
                </select>
                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              {/* Status Filter */}
              <div className="relative group">
                <select 
                  onChange={(e) => updateFilter('status', e.target.value || null)}
                  value={filters.status || ''}
                  className="py-2 pl-3 pr-8 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="recording">Recording</option>
                  <option value="complete">Complete</option>
                </select>
                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1"></div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort</span>
                <div className="relative">
                  <select 
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    value={filters.sortBy || 'year'}
                    className="py-2 pl-3 pr-8 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="year">Year</option>
                    <option value="cost_per_acre">Cost per Acre</option>
                    <option value="total_spent">Total Spent</option>
                    <option value="area">Area</option>
                  </select>
                  <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                
                <button
                  onClick={() => updateFilter('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
                  title={filters.sortDir === 'asc' ? "Ascending" : "Descending"}
                >
                  <svg className={`w-4 h-4 transition-transform ${filters.sortDir === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </button>
              </div>

            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center flex-wrap gap-2 mb-6 px-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Active Filters:</span>
              
              {filters.cropIds?.map(id => {
                const name = filterOptions?.crops.find(c => c.id === id)?.name || id;
                return (
                  <span key={`crop-${id}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                    Crop: {name}
                    <button onClick={() => updateFilter('crop', id.toString(), true)} className="hover:text-emerald-900 dark:hover:text-emerald-100 focus:outline-none"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </span>
                );
              })}

              {filters.years?.map(y => (
                <span key={`year-${y}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                  Year: {y}
                  <button onClick={() => updateFilter('year', y.toString(), true)} className="hover:text-emerald-900 dark:hover:text-emerald-100 focus:outline-none"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </span>
              ))}

              {filters.windows?.map(w => (
                <span key={`win-${w}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-800/50 capitalize">
                  Window: {w}
                  <button onClick={() => updateFilter('window', w, true)} className="hover:text-emerald-900 dark:hover:text-emerald-100 focus:outline-none"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </span>
              ))}

              {filters.status && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-800/50 capitalize">
                  Status: {filters.status}
                  <button onClick={() => updateFilter('status', null)} className="hover:text-emerald-900 dark:hover:text-emerald-100 focus:outline-none"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </span>
              )}

              <button onClick={clearFilters} className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 underline decoration-gray-300 underline-offset-4 ml-2 focus:outline-none">
                Clear all
              </button>
            </div>
          )}

          {/* Season List */}
          {hasNoMatches ? (
            <div className="bg-white dark:bg-white/5 rounded-[24px] p-12 border border-gray-100 dark:border-white/10 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No matches found</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Your current filters didn't match any seasons.</p>
              <button onClick={clearFilters} className="inline-flex items-center bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold py-2.5 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-gray-500 outline-none">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* Table Header (Desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">
                <div className="col-span-1">Compare</div>
                <div className="col-span-3">Season</div>
                <div className="col-span-2 text-right">Area</div>
                <div className="col-span-2 text-right">Total Recorded</div>
                <div className="col-span-3 text-right text-emerald-600 dark:text-emerald-400">Cost per Acre</div>
                <div className="col-span-1 text-center">Flags</div>
              </div>

              {seasons?.map(season => {
                const isSelected = selectedIds.has(season.id);
                const isSelectionMaxed = selectedIds.size >= 4 && !isSelected;

                return (
                  <div 
                    key={season.id} 
                    className={`bg-white dark:bg-white/5 rounded-2xl border transition-all shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center relative
                      ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-100 dark:border-white/10 hover:border-emerald-200 dark:hover:border-emerald-800'}`
                    }
                  >
                    {/* Status accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${season.is_complete ? 'bg-gray-300 dark:bg-gray-600' : 'bg-emerald-500'}`}></div>

                    {/* Mobile: Top Row with Checkbox & Title */}
                    <div className="flex items-start md:items-center w-full md:w-auto md:grid md:grid-cols-12 md:flex-1 gap-4 p-5 md:py-4 md:px-6">
                      
                      {/* Compare Checkbox */}
                      <div className="md:col-span-1 flex items-center shrink-0 pt-1 md:pt-0">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelection(season.id)}
                          disabled={isSelectionMaxed}
                          className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Select ${season.crop_name} ${season.year} for comparison`}
                        />
                      </div>

                      {/* Main Title info */}
                      <div className="md:col-span-3 flex-1">
                        <Link to={`/season/${season.id}`} className="block focus-visible:ring-2 focus-visible:ring-emerald-500 rounded outline-none group">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-gray-900 dark:text-gray-100 text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {season.crop_name}
                            </h3>
                            {!season.is_complete && <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded">Active</span>}
                          </div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                            {season.season_window} {season.year}
                          </p>
                        </Link>
                      </div>

                      {/* Mobile Stats Grid / Desktop Columns */}
                      <div className="hidden md:contents">
                        <div className="md:col-span-2 text-right">
                          <p className="font-bold text-gray-700 dark:text-gray-300">{season.area_planted_acres} <span className="text-xs font-medium text-gray-400">ac</span></p>
                        </div>
                        <div className="md:col-span-2 text-right">
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-lg"><Money pesewas={season.total_recorded_pesewas} /></p>
                        </div>
                        <div className="md:col-span-3 text-right">
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-2xl tracking-tight bg-emerald-50 dark:bg-emerald-900/10 inline-block px-3 py-1 rounded-xl">
                            <Money pesewas={season.cost_per_acre_pesewas} />
                          </p>
                        </div>
                        <div className="md:col-span-1 flex justify-center items-center">
                          {season.has_flagged_categories ? (
                            <span className="flex w-8 h-8 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full items-center justify-center" title="Has flagged categories in latest estimate">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </span>
                          ) : season.latest_estimate_total ? (
                            <span className="flex w-8 h-8 bg-gray-50 dark:bg-white/5 text-emerald-500 rounded-full items-center justify-center" title="Estimate looks good">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          ) : (
                            <span className="flex w-8 h-8 text-gray-300 dark:text-gray-600 rounded-full items-center justify-center" title="No estimate generated">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Mobile Only: Stats Below */}
                    <div className="md:hidden grid grid-cols-2 gap-4 px-5 pb-5 pl-12 border-t border-gray-50 dark:border-white/5 pt-4 mt-2">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cost per Acre</p>
                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xl tracking-tight">
                          <Money pesewas={season.cost_per_acre_pesewas} />
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-base"><Money pesewas={season.total_recorded_pesewas} /></p>
                      </div>
                      <div className="col-span-2 flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-white/5">
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{season.area_planted_acres} acres</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                          {season.has_flagged_categories ? (
                            <span className="flex items-center text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              Flagged
                            </span>
                          ) : season.latest_estimate_total ? (
                            <span className="flex items-center text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              OK
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded">No estimate</span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Comparison Sticky Bar */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 p-4 md:p-6 z-40 animate-fade-in-up pointer-events-none">
          <div className="max-w-2xl mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-2xl p-4 flex items-center justify-between pointer-events-auto border border-gray-800 dark:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800 dark:bg-gray-100 rounded-xl flex items-center justify-center font-black text-xl">
                {selectedIds.size}
              </div>
              <div>
                <p className="font-bold">Seasons selected</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Compare up to 4</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedIds(new Set())} className="text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900">
                Cancel
              </button>
              <Link 
                to={`/compare?s=${Array.from(selectedIds).join(',')}`}
                className="bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-emerald-500 outline-none"
              >
                Compare &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col xl:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsFilterSheetOpen(false)}></div>
          <div className="relative mt-auto bg-white dark:bg-white/5 rounded-t-3xl shadow-2xl w-full max-h-[85vh] flex flex-col animate-fade-in-up">
            <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Filters</h2>
              <button onClick={() => setIsFilterSheetOpen(false)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Sort By</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'year', label: 'Year' },
                    { val: 'cost_per_acre', label: 'Cost/Acre' },
                    { val: 'total_spent', label: 'Total Spent' },
                    { val: 'area', label: 'Area' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => updateFilter('sortBy', opt.val)}
                      className={`py-2 px-3 rounded-xl text-sm font-bold border transition-colors ${filters.sortBy === opt.val ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <button onClick={() => updateFilter('sortDir', 'desc')} className={`flex-1 py-2 text-sm font-bold ${filters.sortDir === 'desc' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 bg-white dark:bg-transparent'}`}>Descending</button>
                  <button onClick={() => updateFilter('sortDir', 'asc')} className={`flex-1 py-2 text-sm font-bold border-l border-gray-200 dark:border-white/10 ${filters.sortDir === 'asc' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 bg-white dark:bg-transparent'}`}>Ascending</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Crop</label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions?.crops.map(c => {
                    const isSelected = filters.cropIds?.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => updateFilter('crop', c.id.toString(), true)}
                        className={`py-1.5 px-3 rounded-lg text-sm font-bold border transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                      >
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Year</label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions?.years.map(y => {
                    const isSelected = filters.years?.includes(y);
                    return (
                      <button
                        key={y}
                        onClick={() => updateFilter('year', y.toString(), true)}
                        className={`py-1.5 px-3 rounded-lg text-sm font-bold border transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                      >
                        {y}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Window</label>
                <div className="grid grid-cols-3 gap-2">
                  {['major', 'minor', 'dry'].map(w => {
                    const isSelected = filters.windows?.includes(w as any);
                    return (
                      <button
                        key={w}
                        onClick={() => updateFilter('window', w, true)}
                        className={`py-2 px-3 rounded-xl text-sm font-bold border transition-colors capitalize ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                      >
                        {w}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['recording', 'complete'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateFilter('status', filters.status === s ? null : s)}
                      className={`py-2 px-3 rounded-xl text-sm font-bold border transition-colors capitalize ${filters.status === s ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-white/10 flex gap-3 bg-white dark:bg-white/5 rounded-b-3xl">
              <button 
                onClick={() => { clearFilters(); setIsFilterSheetOpen(false); }}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 font-bold rounded-xl active:bg-gray-200 transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-[2] py-3.5 bg-emerald-600 text-white font-bold rounded-xl active:bg-emerald-700 transition-colors shadow-sm"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
