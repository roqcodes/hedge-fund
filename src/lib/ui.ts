/** Shared Tailwind class strings for consistent UI (Tailwind-only styling). */

/** Smooth hover / lift — avoids snappy default `ease-out` on short durations */
const easeSmooth = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

export const btnPrimary =
  `inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-[#D11439] to-[#f02852] px-3.5 py-2 text-xs font-bold text-white shadow-primary transition-[transform,box-shadow] duration-300 ${easeSmooth} motion-safe:hover:-translate-y-px motion-safe:hover:shadow-primary-hover motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] motion-safe:active:transition-[transform,box-shadow] motion-safe:active:duration-150 active:shadow-primary sm:px-4 sm:text-sm`;

export const btnSecondary =
  `inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-surface transition-[transform,box-shadow,border-color] duration-300 ${easeSmooth} motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-300/80 motion-safe:hover:shadow-surface-hover motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] motion-safe:active:duration-150 sm:px-4 sm:text-sm`;

export const btnGhost =
  `inline-flex items-center justify-center gap-1.5 rounded-full border-0 bg-transparent px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-[transform,colors,background-color] duration-300 ${easeSmooth} motion-safe:hover:bg-black/[0.05] motion-safe:hover:text-slate-900 motion-safe:active:scale-[0.99] motion-safe:active:duration-150 sm:text-sm`;

export const btnSm = 'px-2.5 py-1 text-[11px] sm:text-xs';

export const pageHeader =
  'mb-1 flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between';

export const pageTitle = 'text-lg font-bold tracking-tight text-slate-900 sm:text-xl md:text-2xl';

export const pageSubtitle = 'mt-1 text-[11px] font-medium text-slate-500 sm:text-xs';

export const kpiGrid =
  'mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-3 [&>*]:motion-safe:animate-fade-in-up [&>*:nth-child(2)]:motion-safe:delay-75 [&>*:nth-child(3)]:motion-safe:delay-150 [&>*:nth-child(4)]:motion-safe:delay-200';

/** Dashboard chart cards: 2×2 from sm up (wider cards = readable axes & legends) */
export const chartGrid = 'mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3';

export const chartArea = 'relative h-44 w-full min-h-[176px] sm:h-48 md:h-52';

export const tableWrap =
  '-mx-1 overflow-x-auto overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0';

export const dataTable = 'w-full min-w-[560px] border-separate border-spacing-y-1.5 text-left text-sm';

export const formLabel = 'mb-1.5 block text-xs font-semibold text-slate-900 sm:text-sm';

export const formInput =
  `w-full rounded-xl border-2 border-black/10 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-surface-xs outline-none transition-[border-color,box-shadow] duration-300 ${easeSmooth} motion-safe:hover:border-black/15 motion-safe:hover:shadow-surface focus:border-accent focus:shadow-[0_0_0_3px_rgba(209,20,57,0.08),0_4px_14px_-4px_rgba(15,23,42,0.06)] sm:px-4 sm:py-3`;

export const formSelect = formInput;

export const formTextarea = `${formInput} min-h-[72px] resize-y`;

export const formGroup = 'mb-4 sm:mb-5';

export const formRow = 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4';

export const formHint = 'mt-1.5 text-[13px] font-medium text-slate-400';

export const formError = 'mt-1.5 text-[13px] font-semibold text-red-600';

export const filtersBar =
  `mb-4 flex flex-wrap items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-2.5 py-2 text-sm shadow-surface backdrop-blur-md transition-[box-shadow] duration-300 ${easeSmooth} motion-safe:hover:shadow-surface-hover sm:gap-2 sm:px-3`;

/** Use either `filterChip` or `filterChipActive` — do not concatenate both (Tailwind can resolve bg/text the wrong way). */
export const filterChip =
  `inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-surface-xs transition-[transform,box-shadow,border-color,background-color] duration-300 ${easeSmooth} motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-300/90 motion-safe:hover:shadow-surface motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] motion-safe:active:duration-150 sm:px-4`;

export const filterChipActive =
  `inline-flex items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white shadow-surface transition-[transform,box-shadow,background-color,border-color] duration-300 ${easeSmooth} motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-800 motion-safe:hover:bg-slate-800 motion-safe:hover:shadow-surface-hover motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] motion-safe:active:duration-150 sm:px-4`;

/** Narrow selects for toolbar rows (`formSelect` is `w-full` and forces stacked layout). */
export const filterSelect =
  `rounded-xl border-2 border-black/10 bg-white px-3 py-2 text-[13px] font-medium text-slate-900 shadow-surface-xs outline-none transition-[border-color,box-shadow] duration-300 ${easeSmooth} motion-safe:hover:border-black/15 motion-safe:hover:shadow-surface focus:border-accent focus:shadow-[0_0_0_3px_rgba(209,20,57,0.08),0_4px_14px_-4px_rgba(15,23,42,0.06)] sm:px-3.5 sm:py-2 sm:text-sm`;

export const tabsBar =
  'mb-4 flex gap-1 overflow-x-auto border-b border-black/10 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 [&::-webkit-scrollbar]:hidden';

/** Use either `tabBtn` or `tabBtnActive` — do not concatenate both. */
export const tabBtn =
  `shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition-[transform,colors,background-color,box-shadow] duration-300 ${easeSmooth} motion-safe:hover:bg-black/[0.04] motion-safe:hover:text-slate-900 motion-safe:active:scale-[0.99] motion-safe:active:duration-150 sm:px-4 sm:text-sm`;

export const tabBtnActive =
  `shrink-0 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-xs font-bold text-accent shadow-surface transition-[transform,colors,background-color,box-shadow,border-color] duration-300 ${easeSmooth} motion-safe:hover:border-accent/35 motion-safe:hover:bg-accent/15 motion-safe:hover:shadow-surface-hover motion-safe:active:scale-[0.99] motion-safe:active:duration-150 sm:px-4 sm:text-sm`;
