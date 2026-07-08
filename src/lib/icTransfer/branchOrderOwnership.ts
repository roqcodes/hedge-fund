import type { ICSale } from '@/types';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import { normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';
import { isDateInRange } from '@/lib/dateFilterRange';
import { toBusinessDate } from '@/lib/businessTime';
import type { DateFilterRange } from '@/lib/dateFilterRange';
import { isBranchPageEnabled } from '@/lib/branchPages';

/** Order placed by branch staff/manager on behalf of an end customer. */
export function isBranchSubmittedSale(sale: ICSale, branchName: string): boolean {
  return sale.customerName.toLowerCase() === branchName.toLowerCase();
}

/** True when customer orders should be stored under the branch name (no IC Transfer Admin page). */
export function shouldRecordCustomerOrderUnderBranch(hiddenPages?: string[] | null): boolean {
  return !isBranchPageEnabled('ic-transfer-admin', hiddenPages);
}

/** Sale recorded with the end customer in customer_name (branch has IC Transfer Admin). */
export function isDirectCustomerNamedSale(sale: ICSale, branchName: string): boolean {
  return !isBranchSubmittedSale(sale, branchName);
}

/** Customer-portal order stored under branch name (entered by the customer, not branch staff). */
export function isCustomerPortalOrderUnderBranch(sale: ICSale, branchName: string): boolean {
  if (!isBranchSubmittedSale(sale, branchName) || !sale.orderCustomerId) return false;
  if (!sale.enteredByName || !sale.orderCustomerName) return false;
  return sale.enteredByName.toLowerCase() === sale.orderCustomerName.toLowerCase();
}

/** Order placed directly by a logged-in customer (recorded under their name). */
export function isCustomerSubmittedSale(
  sale: ICSale,
  customerId: string,
  customerName: string,
  _branchName: string,
): boolean {
  if (sale.orderCustomerId === customerId) return true;
  if (customerName && sale.customerName.toLowerCase() === customerName.toLowerCase()) return true;
  return false;
}

export function customerOwnsSale(
  sale: ICSale,
  customerId: string,
  customerName: string,
  branchName: string,
): boolean {
  return isCustomerSubmittedSale(sale, customerId, customerName, branchName);
}

export function saleBelongsToBranchPortal(
  sale: ICSale,
  branchName: string,
  branchCustomerIds: Set<string>,
  branchCustomerNames?: Set<string>,
): boolean {
  if (isBranchSubmittedSale(sale, branchName)) return true;

  if (sale.orderCustomerId && branchCustomerIds.has(sale.orderCustomerId)) {
    return true;
  }

  // Customer-portal orders store the end customer in customer_name (not branch name).
  const customerName = sale.customerName?.trim().toLowerCase();
  if (customerName && branchCustomerNames?.has(customerName)) {
    return true;
  }

  return false;
}

/** Display name for the end customer on a branch-portal order row. */
export function getBranchPortalOrderCustomerName(sale: ICSale, branchName: string): string {
  return getAdminSaleCustomerName(sale, branchName);
}

/** Display name for the end customer on the admin sales page. */
export function getAdminSaleCustomerName(
  sale: ICSale,
  branchName: string,
  branches?: { name: string }[],
): string {
  if (isBranchSubmittedSale(sale, branchName)) {
    return sale.orderCustomerName || sale.customerName;
  }

  // HQ view: customer_name may be a branch while order_customer_name holds the end customer.
  if (
    branches?.some(b => b.name === sale.customerName) &&
    sale.orderCustomerName
  ) {
    return sale.orderCustomerName;
  }

  return sale.customerName;
}

/** End-customer id for phone, currency, and messaging lookups. */
export function getSaleEndCustomerId(sale: ICSale, branchName: string): string | undefined {
  if (isBranchSubmittedSale(sale, branchName)) {
    return sale.orderCustomerId;
  }
  return sale.orderCustomerId || undefined;
}

/** End-customer name for phone, currency, and messaging lookups. */
export function getSaleEndCustomerName(sale: ICSale, branchName: string, branches?: { name: string }[]): string {
  return getAdminSaleCustomerName(sale, branchName, branches);
}

/** Label for the original order proof image based on who submitted the order. */
export function getSaleOrderImageLabel(sale: ICSale, branchName: string): string {
  if (isDirectCustomerNamedSale(sale, branchName) || isCustomerPortalOrderUnderBranch(sale, branchName)) {
    return 'Original Order Image (Customer Upload)';
  }
  return 'Original Order Image (Branch Upload)';
}

/** Branches whose customers place orders under the branch name (no IC Transfer Admin page). */
export function getAdminLessBranches(
  allBranches: { name: string; hiddenPages?: string[] | null }[],
): { name: string; hiddenPages?: string[] | null }[] {
  return allBranches.filter(b => shouldRecordCustomerOrderUnderBranch(b.hiddenPages));
}

/** Sale recorded under an admin-less branch name (customer portal without IC Transfer Admin). */
export function isSaleFromAdminLessBranch(
  sale: ICSale,
  allBranches: { name: string; hiddenPages?: string[] | null }[],
): boolean {
  const customerName = sale.customerName?.trim().toLowerCase();
  if (!customerName) return false;
  return getAdminLessBranches(allBranches).some(
    b => b.name.trim().toLowerCase() === customerName,
  );
}

export function saleBelongsToICTransferAdminView(
  sale: ICSale,
  branchName: string,
  branchCustomerIds: Set<string>,
  branchCustomerNames: Set<string> | undefined,
  allBranches: { name: string; hiddenPages?: string[] | null }[],
): boolean {
  if (saleBelongsToBranchPortal(sale, branchName, branchCustomerIds, branchCustomerNames)) {
    return true;
  }

  // Central admin processes customer-portal orders from branches without their own admin panel.
  if (isSaleFromAdminLessBranch(sale, allBranches)) {
    return true;
  }

  return false;
}

/** Scope sales visible on a branch-admin IC Transfer view (branch + portal customer orders). */
export function scopeSalesForBranchAdmin(
  sales: ICSale[],
  branchName: string,
  branchCustomerIds: Set<string>,
  branchCustomerNames: Set<string> | undefined,
  allBranches: { name: string; hiddenPages?: string[] | null }[] = [],
): ICSale[] {
  return sales.filter(s =>
    saleBelongsToICTransferAdminView(
      s,
      branchName,
      branchCustomerIds,
      branchCustomerNames,
      allBranches,
    ) ||
    (branchCustomerIds.size === 0 && Boolean(s.orderCustomerId)),
  );
}

/** Date filter that keeps pending orders visible regardless of created date. */
export function saleMatchesDateFilter(sale: ICSale, range: DateFilterRange): boolean {
  if (normalizeOrderStatus(sale.orderStatus) === 'pending') return true;
  if (!sale.createdAt) return true;
  return isDateInRange(toBusinessDate(sale.createdAt, 'Asia/Dubai'), range);
}

export function saleMatchesSearchQuery(
  sale: ICSale,
  query: string,
  branches: { name: string }[],
  branchName: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const formattedId = getFormattedTxnId(sale.id, 'sale', sale, branches, branchName).toLowerCase();
  const displayName = getAdminSaleCustomerName(sale, branchName, branches).toLowerCase();

  return (
    formattedId.includes(q) ||
    sale.id.toLowerCase().includes(q) ||
    displayName.includes(q) ||
    (sale.orderCustomerName?.toLowerCase().includes(q) ?? false) ||
    sale.customerName.toLowerCase().includes(q)
  );
}
