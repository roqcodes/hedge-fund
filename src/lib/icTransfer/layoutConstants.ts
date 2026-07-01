/** Layout constants for IC Transfer / branch portal pages */

export const portalKpiGrid =
  'mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-2 lg:gap-3 [&>*]:motion-safe:animate-fade-in-up';

/** Mobile-only toolbar row — aligns search with page gutters below sm */
export const portalMobileToolbarClass =
  'flex flex-col gap-3 px-4 pb-4 max-sm:px-0 sm:flex-row sm:items-center sm:gap-4';

/** Toolbar row inside md+ card shells (warehouse-style tables) */
export const portalMobileToolbarMdClass =
  'flex flex-col gap-3 px-4 pb-4 max-sm:px-0 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:gap-4';

/** Mobile card list container — matches toolbar horizontal inset */
export const portalMobileCardListClass =
  'flex md:hidden flex-col gap-3 py-4 max-sm:px-0 px-4';

/** Horizontally scrollable filter chips/selects on narrow screens */
export const portalMobileToolbarFiltersClass =
  'flex shrink-0 flex-wrap items-center gap-2 max-sm:-mx-1 max-sm:overflow-x-auto max-sm:px-1 max-sm:pb-0.5 max-sm:scrollbar-none';

/** Footer row: status left, primary action right */
export const portalMobileCardFooterClass =
  'flex items-center justify-between gap-3 border-t border-slate-50 pt-2';

/** @deprecated IC Transfer dual-sidebar offset — secondary sidebar removed */
export const MAIN_SIDEBAR_COLLAPSED_W = 80;
export const MAIN_SIDEBAR_EXPANDED_W = 240;
export const IC_SECONDARY_SIDEBAR_W = 220;
export const IC_SECONDARY_SIDEBAR_W_XL = 240;

export function icTransferContentOffset(collapsedMain = true): string {
  const main = collapsedMain ? MAIN_SIDEBAR_COLLAPSED_W : MAIN_SIDEBAR_EXPANDED_W;
  return `${main + IC_SECONDARY_SIDEBAR_W}px`;
}
