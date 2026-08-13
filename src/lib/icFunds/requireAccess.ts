import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isBranchPageEnabled } from '@/lib/branchPages';
import {
  canReadPage,
  canWritePage,
  isBranchScopedUser,
  READ_ONLY_ACCESS_MESSAGE,
} from '@/lib/rbac';
import type { User } from '@/types';

export type ICFundsAccessOk = {
  ok: true;
  user: User;
  slug: string;
  hiddenPages: string[];
};

export type ICFundsAccessErr = { ok: false; error: string };

function parseHiddenPages(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(String) : [];
}

export async function requireICFundsAccess(
  branchId: string,
  mode: 'read' | 'write',
): Promise<ICFundsAccessOk | ICFundsAccessErr> {
  const branchRes = await query(
    `SELECT id, slug, hidden_pages FROM branches WHERE id = $1 LIMIT 1`,
    [branchId],
  );
  const row = branchRes.rows[0];
  if (!row) return { ok: false, error: 'Branch not found' };

  const slug = String(row.slug);
  const hiddenPages = parseHiddenPages(row.hidden_pages);
  const user = await getSessionUser(slug);
  if (!user) return { ok: false, error: 'Not authenticated' };

  if (isBranchScopedUser(user) && user.branchId && user.branchId !== branchId) {
    return { ok: false, error: 'Forbidden' };
  }

  if (!isBranchPageEnabled('ic-funds', hiddenPages) || !canReadPage(user, 'ic-funds', hiddenPages)) {
    return { ok: false, error: 'Forbidden' };
  }

  if (mode === 'write' && !canWritePage(user, 'ic-funds', hiddenPages)) {
    return { ok: false, error: READ_ONLY_ACCESS_MESSAGE };
  }

  return { ok: true, user, slug, hiddenPages };
}
