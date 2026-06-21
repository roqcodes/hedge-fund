'use server';

import { query } from '@/lib/db';
import type { GlobalSearchResult, GlobalSearchSection } from '@/lib/globalSearch';
import { SEARCH_CATEGORY_LABELS } from '@/lib/globalSearch';

export async function searchCatalogAction(
  searchQuery: string,
  branchSlug?: string,
): Promise<{ success: boolean; sections: GlobalSearchSection[]; error?: string }> {
  const q = searchQuery.trim();
  if (q.length < 1) return { success: true, sections: [] };

  try {
    const like = `%${q.toLowerCase()}%`;
    const sections: GlobalSearchSection[] = [];

    let productRows: Record<string, unknown>[] = [];
    if (branchSlug) {
      const res = await query(
        `SELECT p.id, p.name, p.sku, p.brand, p.metal_type, p.status, b.slug AS branch_slug
         FROM products p
         LEFT JOIN branches b ON p.branch_id = b.id
         WHERE (b.slug = $1 OR p.branch_id IS NULL)
           AND (
             LOWER(p.name) LIKE $2 OR LOWER(p.sku) LIKE $2 OR LOWER(COALESCE(p.brand, '')) LIKE $2
             OR LOWER(COALESCE(p.metal_type, '')) LIKE $2
           )
         ORDER BY p.name ASC
         LIMIT 6`,
        [branchSlug, like],
      );
      productRows = res.rows;
    } else {
      const res = await query(
        `SELECT p.id, p.name, p.sku, p.brand, p.metal_type, p.status, b.slug AS branch_slug
         FROM products p
         LEFT JOIN branches b ON p.branch_id = b.id
         WHERE LOWER(p.name) LIKE $1 OR LOWER(p.sku) LIKE $1 OR LOWER(COALESCE(p.brand, '')) LIKE $1
         ORDER BY p.name ASC
         LIMIT 6`,
        [like],
      );
      productRows = res.rows;
    }

    if (productRows.length > 0) {
      sections.push({
        category: 'products',
        label: SEARCH_CATEGORY_LABELS.products,
        results: productRows.map(row => {
          const slug = String(row.branch_slug || branchSlug || '');
          const base = slug ? `/${slug}` : '';
          return {
            id: `prod-${row.id}`,
            category: 'products' as const,
            title: String(row.name),
            subtitle: String(row.sku),
            meta: [row.brand, row.metal_type].filter(Boolean).join(' · ') || undefined,
            href: `${base}/products`,
            badge: String(row.status || 'Active'),
            badgeTone: 'info' as const,
          } satisfies GlobalSearchResult;
        }),
      });
    }

    let invoiceRows: Record<string, unknown>[] = [];
    if (branchSlug) {
      const res = await query(
        `SELECT i.id, i.doc_no, i.customer_details, i.net_amt_bc, i.doc_date, b.slug AS branch_slug
         FROM tax_invoices i
         JOIN branches b ON i.branch_id = b.id
         WHERE b.slug = $1
           AND (
             LOWER(i.doc_no) LIKE $2
             OR LOWER(COALESCE(i.customer_details, '')) LIKE $2
             OR LOWER(COALESCE(i.ref_no, '')) LIKE $2
           )
         ORDER BY i.doc_date DESC
         LIMIT 6`,
        [branchSlug, like],
      );
      invoiceRows = res.rows;
    } else {
      const res = await query(
        `SELECT i.id, i.doc_no, i.customer_details, i.net_amt_bc, i.doc_date, b.slug AS branch_slug
         FROM tax_invoices i
         LEFT JOIN branches b ON i.branch_id = b.id
         WHERE LOWER(i.doc_no) LIKE $1
           OR LOWER(COALESCE(i.customer_details, '')) LIKE $1
           OR LOWER(COALESCE(i.ref_no, '')) LIKE $1
         ORDER BY i.doc_date DESC
         LIMIT 6`,
        [like],
      );
      invoiceRows = res.rows;
    }

    if (invoiceRows.length > 0) {
      sections.push({
        category: 'marketplace',
        label: SEARCH_CATEGORY_LABELS.marketplace,
        results: invoiceRows.map(row => {
          const slug = String(row.branch_slug || branchSlug || '');
          const base = slug ? `/${slug}` : '';
          const customer = String(row.customer_details || '').slice(0, 80);
          return {
            id: `inv-${row.id}`,
            category: 'marketplace' as const,
            title: String(row.doc_no),
            subtitle: customer || 'Tax invoice',
            meta: row.net_amt_bc != null ? `AED ${Number(row.net_amt_bc).toLocaleString()}` : undefined,
            href: `${base}/marketplace`,
            badge: 'Invoice',
            badgeTone: 'warning' as const,
          } satisfies GlobalSearchResult;
        }),
      });
    }

    return { success: true, sections };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return { success: false, sections: [], error: message };
  }
}
