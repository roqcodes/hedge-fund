import type { PhysicalBuy, PhysicalSell } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PhysicalDraftBuy extends PhysicalBuy {
  isDraft: true;
  draftId: string;
  createdAt: string;
}

export interface PhysicalDraftSell extends PhysicalSell {
  isDraft: true;
  draftId: string;
  createdAt: string;
}

export interface PhysicalDraftState {
  buys: PhysicalDraftBuy[];
  sells: PhysicalDraftSell[];
}

export const EMPTY_DRAFT_STATE: PhysicalDraftState = { buys: [], sells: [] };

// ─── Draft builders ─────────────────────────────────────────────────────────

const isBrowser = () => typeof window !== 'undefined';

const newDraftId = () =>
  isBrowser() && 'crypto' in window && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Build a draft buy from the fields the create action would receive. */
export function buildDraftBuy(
  input: Omit<PhysicalBuy, 'id' | 'remainingWeight' | 'status'> &
    Partial<Pick<PhysicalBuy, 'remainingWeight' | 'status'>>,
): PhysicalDraftBuy {
  const draftId = newDraftId();
  return {
    ...input,
    id: `draft-${draftId}`,
    remainingWeight: input.remainingWeight ?? input.pureGram,
    status: input.status ?? 'active',
    isDraft: true,
    draftId,
    createdAt: new Date().toISOString(),
  };
}

/** Build a draft sell referencing a real buy. */
export function buildDraftSell(input: Omit<PhysicalSell, 'id'>): PhysicalDraftSell {
  const draftId = newDraftId();
  return {
    ...input,
    id: `draft-${draftId}`,
    isDraft: true,
    draftId,
    createdAt: new Date().toISOString(),
  };
}
