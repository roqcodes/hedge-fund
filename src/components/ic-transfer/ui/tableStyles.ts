/** Shared table header styles — bold black headers & row labels */
export const icThClass = (align: 'left' | 'center' | 'right' = 'left') =>
  `px-3 pb-3 text-${align} text-[11px] font-bold uppercase tracking-wider text-slate-900 sm:px-5`;

export const icThSortableClass = (align: 'left' | 'center' | 'right' = 'left') =>
  `group cursor-pointer select-none ${icThClass(align)} transition-colors hover:bg-slate-50`;

export const icSectionCardClass =
  'animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover';

/** Dense summary matrix — city overview tables */
export const icCompactTable = 'w-full min-w-0 border-collapse text-left text-xs';

export const icCompactTh = (align: 'left' | 'center' = 'left') =>
  `border-b border-slate-200 px-2 py-2 text-${align} text-[10px] font-bold uppercase tracking-wider text-slate-900 sm:px-3`;

export const icCompactMetricLabel =
  'whitespace-nowrap border-b border-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-900 sm:px-3';

export const icCompactCell =
  'border-b border-slate-50 px-2 py-1.5 text-center font-mono text-xs tabular-nums text-slate-800 sm:px-3';

export const icRowLabelClass =
  'border-y border-black/5 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 sm:px-4';
