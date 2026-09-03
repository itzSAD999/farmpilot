import { useEffect, useRef, useState } from 'react';

interface GhanaMapProps {
  selectedRegion: string;
  onSelect: (region: string) => void;
}

export function mapRegionName(raw: string | null | undefined) {
  if (!raw) return null;
  if (raw === 'Northern East') return 'North East';
  return raw;
}

export function GhanaMap({ selectedRegion, onSelect }: GhanaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    fetch('/gh.svg')
      .then((res) => res.text())
      .then((text) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = text;

        const svg = containerRef.current.querySelector('svg');
        if (!svg) return;

        svg.querySelectorAll('#points, #label_points, text, circle').forEach((el) => {
          (el as HTMLElement).style.pointerEvents = 'none';
        });

        svg.querySelectorAll('path[name]').forEach((path) => {
          path.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const mapped = mapRegionName(path.getAttribute('name'));
            if (mapped) onSelectRef.current(mapped);
          });
          path.addEventListener('mouseenter', () => {
            setHoveredRegion(mapRegionName(path.getAttribute('name')));
          });
          path.addEventListener('mouseleave', () => {
            setHoveredRegion(null);
          });
        });

        setIsLoaded(true);
      })
      .catch((err) => console.error('Failed to load map SVG', err));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <style>{`
        .ghana-svg-container svg {
          width: 100%;
          height: auto;
          max-height: 420px;
          display: block;
          filter: drop-shadow(0 15px 25px rgba(16, 185, 129, 0.15));
        }
        .ghana-svg-container path[name] {
          transition: fill 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          stroke: #ffffff;
          stroke-width: 1;
          pointer-events: auto;
        }
        .ghana-svg-container path[name]:hover {
          fill: #34d399 !important;
        }
        .ghana-svg-container path[name="${selectedRegion}"],
        .ghana-svg-container path[name="${selectedRegion === 'North East' ? 'Northern East' : selectedRegion}"] {
          fill: #1B5E20 !important;
          stroke: #ffffff;
          stroke-width: 2;
        }
        html.dark .ghana-svg-container path[name] {
          stroke: #1c2622;
        }
      `}</style>
      
      <div className="relative w-full max-w-md rounded-3xl p-4 flex items-center justify-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 overflow-hidden isolate">
        {selectedRegion && (
          <div className="absolute top-6 left-6 z-20 animate-fade-in-up pointer-events-none">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Selected Region</span>
            <span className="text-2xl font-black text-[#1B5E20] dark:text-emerald-400 tracking-tight bg-white/80 dark:bg-[#1a1a1a]/80 px-3 py-1 rounded-lg backdrop-blur-sm shadow-sm">{selectedRegion}</span>
          </div>
        )}

        {hoveredRegion && (
          <div className="absolute top-6 right-6 z-20 animate-fade-in pointer-events-none text-right">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Tap to select</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight bg-white/80 dark:bg-[#1a1a1a]/80 px-3 py-1 rounded-lg backdrop-blur-sm shadow-sm">{hoveredRegion}</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="ghana-svg-container w-full relative z-10"
        />
        {!isLoaded && (
          <div className="absolute inset-0 animate-pulse flex items-center justify-center pointer-events-none">
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm">Loading map...</span>
          </div>
        )}
      </div>
    </div>
  );
}
