import { useState, useEffect } from 'react';

interface GhanaMapProps {
  selectedRegion: string;
  onSelect: (region: string) => void;
}

export function GhanaMap({ selectedRegion, onSelect }: GhanaMapProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    fetch('/gh.svg')
      .then(res => res.text())
      .then(text => setSvgContent(text))
      .catch(err => console.error('Failed to load map SVG', err));
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    // Walk up the tree in case they clicked on a sub-element of the path
    const pathNode = target.closest('path');
    if (pathNode) {
      const regionName = pathNode.getAttribute('name');
      if (regionName) {
        let mappedName = regionName;
        // The SVG labels "North East" as "Northern East"
        if (mappedName === 'Northern East') mappedName = 'North East';
        
        onSelect(mappedName);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <style>{`
        .ghana-svg-container svg {
          width: 100%;
          height: auto;
          max-height: 450px;
          filter: drop-shadow(0 15px 25px rgba(16, 185, 129, 0.15));
        }
        .ghana-svg-container path {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          stroke: #ffffff;
          stroke-width: 1;
        }
        .ghana-svg-container path:hover {
          fill: #34d399 !important; /* emerald-400 */
          transform: translateY(-2px);
        }
        /* Fallback for "North East" vs "Northern East" */
        .ghana-svg-container path[name="${selectedRegion}"],
        .ghana-svg-container path[name="${selectedRegion === 'North East' ? 'Northern East' : selectedRegion}"] {
          fill: #1B5E20 !important;
          stroke: #ffffff;
          stroke-width: 2;
        }
      `}</style>
      
      <div className="relative w-full max-w-md rounded-3xl p-4 flex items-center justify-center bg-gray-50 border border-gray-100">
        {selectedRegion && (
          <div className="absolute top-6 left-6 z-20 animate-fade-in-up pointer-events-none">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Selected Region</span>
            <span className="text-2xl font-black text-[#1B5E20] tracking-tight bg-white/80 px-3 py-1 rounded-lg backdrop-blur-sm shadow-sm">{selectedRegion}</span>
          </div>
        )}
        
        {svgContent ? (
          <div 
            className="ghana-svg-container w-full animate-fade-in relative z-10"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            onClick={handleClick}
          />
        ) : (
          <div className="animate-pulse w-full aspect-[3/4] max-w-[320px] bg-emerald-50 rounded-[40%] flex items-center justify-center border border-emerald-100/50">
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm">Loading map...</span>
          </div>
        )}
      </div>
    </div>
  );
}
