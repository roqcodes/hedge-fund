/** Layout constants for IC Transfer dual-sidebar shell */
export const MAIN_SIDEBAR_COLLAPSED_W = 80;
export const MAIN_SIDEBAR_EXPANDED_W = 240;
export const IC_SECONDARY_SIDEBAR_W = 220;
export const IC_SECONDARY_SIDEBAR_W_XL = 240;

export function icTransferContentOffset(collapsedMain = true): string {
  const main = collapsedMain ? MAIN_SIDEBAR_COLLAPSED_W : MAIN_SIDEBAR_EXPANDED_W;
  return `${main + IC_SECONDARY_SIDEBAR_W}px`;
}
