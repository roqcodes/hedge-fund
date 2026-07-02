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

const EMPTY_STATE: PhysicalDraftState = { buys: [], sells: [] };

// ─── Storage keys ────────────────────────────────────────────────────────

const draftsKey = (slug: string) => `hedge_physical_drafts_${slug}`;
const tabsKey = (slug: string) => `hedge_physical_draft_tabs_${slug}`;

// Heartbeat tuning — a tab is considered dead if unseen for STALE_MS.
const HEARTBEAT_MS = 3000;
const STALE_MS = 9000;

const isBrowser = () => typeof window !== 'undefined';

// ─── Draft state persistence ──────────────────────────────────────────────

export function loadDrafts(slug: string): PhysicalDraftState {
  if (!isBrowser()) return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(draftsKey(slug));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<PhysicalDraftState>;
    return {
      buys: Array.isArray(parsed.buys) ? parsed.buys : [],
      sells: Array.isArray(parsed.sells) ? parsed.sells : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

const DRAFTS_EVENT = 'hedge:physical-drafts-changed';

function persistDrafts(slug: string, state: PhysicalDraftState) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(draftsKey(slug), JSON.stringify(state));
    // Notify listeners in the same tab (storage event only fires cross-tab).
    window.dispatchEvent(new CustomEvent(DRAFTS_EVENT, { detail: { slug } }));
  } catch {
    /* quota / serialization errors are non-fatal for drafts */
  }
}

export function clearDrafts(slug: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(draftsKey(slug));
    window.dispatchEvent(new CustomEvent(DRAFTS_EVENT, { detail: { slug } }));
  } catch {
    /* ignore */
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function addDraftBuy(slug: string, buy: PhysicalDraftBuy): PhysicalDraftState {
  const state = loadDrafts(slug);
  const next = { ...state, buys: [buy, ...state.buys] };
  persistDrafts(slug, next);
  return next;
}

export function addDraftSell(slug: string, sell: PhysicalDraftSell): PhysicalDraftState {
  const state = loadDrafts(slug);
  const next = { ...state, sells: [sell, ...state.sells] };
  persistDrafts(slug, next);
  return next;
}

export function removeDraftBuy(slug: string, draftId: string): PhysicalDraftState {
  const state = loadDrafts(slug);
  const next = { ...state, buys: state.buys.filter(b => b.draftId !== draftId) };
  persistDrafts(slug, next);
  return next;
}

export function removeDraftSell(slug: string, draftId: string): PhysicalDraftState {
  const state = loadDrafts(slug);
  const next = { ...state, sells: state.sells.filter(s => s.draftId !== draftId) };
  persistDrafts(slug, next);
  return next;
}

// ─── Pub/Sub ──────────────────────────────────────────────────────────────

/** Subscribe to draft changes for a slug (same-tab custom event + cross-tab storage event). */
export function subscribeDrafts(slug: string, callback: () => void): () => void {
  if (!isBrowser()) return () => {};

  const onCustom = (e: Event) => {
    if ((e as CustomEvent).detail?.slug === slug) callback();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === draftsKey(slug)) callback();
  };

  window.addEventListener(DRAFTS_EVENT, onCustom);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(DRAFTS_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

// ─── Tab lifecycle (heartbeat registry) ────────────────────────────────────
//
// Goal: drafts live while any /[slug]/ tab is open, and are cleared once all
// have closed. We can't reliably detect the *last* tab closing (refresh looks
// the same as a close), so instead each tab writes a heartbeat and prunes dead
// tabs on open. When a fresh tab finds no live tabs, it wipes stale drafts.

const TAB_ID =
  isBrowser() && 'crypto' in window && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const registeredSlugs = new Set<string>();

function readTabRegistry(slug: string): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(tabsKey(slug));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeTabRegistry(slug: string, registry: Record<string, number>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(tabsKey(slug), JSON.stringify(registry));
  } catch {
    /* ignore */
  }
}

function pruneRegistry(registry: Record<string, number>): Record<string, number> {
  const now = Date.now();
  const live: Record<string, number> = {};
  for (const [id, seen] of Object.entries(registry)) {
    if (now - seen < STALE_MS) live[id] = seen;
  }
  return live;
}

/**
 * Registers this tab for a slug (idempotent per tab). On first registration for
 * a "fresh session" (no other live tabs), clears leftover drafts. Returns a
 * cleanup function that stops the heartbeat and deregisters this tab.
 */
export function registerDraftTab(slug: string): () => void {
  if (!isBrowser() || registeredSlugs.has(slug)) return () => {};
  registeredSlugs.add(slug);

  const live = pruneRegistry(readTabRegistry(slug));
  const otherTabsAlive = Object.keys(live).some(id => id !== TAB_ID);

  // Fresh session — no other tab kept the drafts alive, so discard stale ones.
  if (!otherTabsAlive) {
    clearDrafts(slug);
  }

  const beat = () => {
    const registry = pruneRegistry(readTabRegistry(slug));
    registry[TAB_ID] = Date.now();
    writeTabRegistry(slug, registry);
  };
  beat();
  const interval = window.setInterval(beat, HEARTBEAT_MS);

  const deregister = () => {
    const registry = pruneRegistry(readTabRegistry(slug));
    delete registry[TAB_ID];
    writeTabRegistry(slug, registry);
    if (Object.keys(registry).length === 0) {
      clearDrafts(slug);
    }
  };
  const onPageHide = () => deregister();
  window.addEventListener('pagehide', onPageHide);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('pagehide', onPageHide);
    registeredSlugs.delete(slug);
  };
}

// ─── Draft builders ─────────────────────────────────────────────────────────

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
export function buildDraftSell(
  input: Omit<PhysicalSell, 'id'>,
): PhysicalDraftSell {
  const draftId = newDraftId();
  return {
    ...input,
    id: `draft-${draftId}`,
    isDraft: true,
    draftId,
    createdAt: new Date().toISOString(),
  };
}
