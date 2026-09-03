import { useState, useRef, useEffect } from 'react';

interface InfoTipProps {
  /** Short explanation shown in the popover — say what the number/section means and where it comes from. */
  text: string;
  className?: string;
  /** A short heading shown above `text` in bold — mainly useful with `variant="card"`. */
  title?: string;
  /** A concrete, real-farm worked example, visually set apart from `text`. Only rendered in `variant="card"`. */
  example?: string;
  /**
   * "default" — the small, single-line popover used throughout the app for
   * "what does this number mean." "card" — a wider box with a heading and
   * an optional worked example, for the rarer case where one line isn't
   * enough to actually explain what a whole feature is for and how a
   * farmer would really use it (currently just Cost Lab).
   */
  variant?: 'default' | 'card';
}

/**
 * A small "i" icon that reveals a plain-language explanation on click/hover —
 * for anywhere a number, chart, or filter isn't self-explanatory on its own
 * (e.g. "what does cost per acre mean here", "why is this crop excluded").
 * Click-to-toggle rather than hover-only so it works on touch devices.
 */
export function InfoTip({ text, className = '', title, example, variant = 'default' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const isCard = variant === 'card';

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        aria-label="More information"
        aria-expanded={open}
        className="print:hidden w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center text-[10px] font-bold leading-none transition-colors shrink-0"
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          onMouseLeave={() => setOpen(false)}
          className={
            isCard
              ? 'absolute z-50 top-6 left-1/2 -translate-x-1/2 w-80 sm:w-96 p-5 rounded-2xl bg-gray-900 dark:bg-black text-white shadow-xl border border-white/10 animate-fade-in'
              : 'absolute z-50 top-6 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl bg-gray-900 dark:bg-black text-white text-xs leading-relaxed font-medium shadow-xl border border-white/10 animate-fade-in'
          }
        >
          {isCard ? (
            <>
              {title && <p className="text-sm font-bold mb-2">{title}</p>}
              <p className="text-xs leading-relaxed font-medium text-white/90">{text}</p>
              {example && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">On a real farm</p>
                  <p className="text-xs leading-relaxed text-white/80">{example}</p>
                </div>
              )}
            </>
          ) : (
            text
          )}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-black border-l border-t border-white/10 rotate-45" />
        </div>
      )}
    </span>
  );
}
