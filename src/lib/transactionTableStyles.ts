/** Compact padding for fund transaction tables */
export const txnTh =
  'px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400';

export const txnThSortable =
  'group cursor-pointer select-none px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600';

export const txnTd = 'border-y border-black/5 bg-white px-2 py-2.5';

export const txnTdFromTo =
  'border-y border-black/5 bg-white px-2 py-2.5 text-xs font-bold text-slate-900';

/** Notes column — grows to fill remaining table width. */
export const txnTdNotes = `${txnTd} min-w-[120px] align-top`;

/** By column — fixed narrow width for stacked name + email. */
export const txnThBy = `${txnTh} w-[96px] min-w-[96px] max-w-[96px]`;
export const txnTdBy = `${txnTd} w-[96px] min-w-[96px] max-w-[96px] align-top`;

export const txnModalTh = 'py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400';

export const txnModalTd = 'py-2 px-2';

export const txnModalFromTo = 'py-2 px-2 text-xs font-bold text-slate-900';
