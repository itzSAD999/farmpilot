import { useState, useRef, useEffect } from 'react';

interface InfoTipProps {
  /** Short explanation shown in the popover — say what the number/section means and where it comes from. */
  text: string;
  className?: string;
}

/**
 * A small "i" icon that reveals a plain-language explanation on click/hover —
 * for anywhere a number, chart, or filter isn't self-explanatory on its own
 * (e.g. "what does cost per acre mean here", "why is this crop excluded").
 * Click-to-toggle rather than hover-only so it works on touch devices.
 */
export function InfoTip({ text, className = '' }: InfoTipProps) {
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
          className="absolute z-50 top-6 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl bg-gray-900 dark:bg-black text-white text-xs leading-relaxed font-medium shadow-xl border border-white/10 animate-fade-in"
        >
          {text}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-black border-l border-t border-white/10 rotate-45" />
        </div>
      )}
    </span>
  );
}
