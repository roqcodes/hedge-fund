'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDraftBuy,
  addDraftSell,
  loadDrafts,
  registerDraftTab,
  removeDraftBuy,
  removeDraftSell,
  subscribeDrafts,
  type PhysicalDraftBuy,
  type PhysicalDraftSell,
  type PhysicalDraftState,
} from '@/lib/physical/drafts';

const EMPTY: PhysicalDraftState = { buys: [], sells: [] };

/**
 * Local, per-branch draft store for physical deals. Drafts are shared across
 * open tabs of the same branch and cleared once all tabs are closed.
 */
export function usePhysicalDrafts(slug: string | undefined) {
  const [state, setState] = useState<PhysicalDraftState>(EMPTY);

  useEffect(() => {
    if (!slug) {
      setState(EMPTY);
      return;
    }
    const stopTab = registerDraftTab(slug);
    setState(loadDrafts(slug));
    const unsubscribe = subscribeDrafts(slug, () => setState(loadDrafts(slug)));
    return () => {
      unsubscribe();
      stopTab();
    };
  }, [slug]);

  const saveDraftBuy = useCallback(
    (buy: PhysicalDraftBuy) => {
      if (!slug) return;
      setState(addDraftBuy(slug, buy));
    },
    [slug],
  );

  const saveDraftSell = useCallback(
    (sell: PhysicalDraftSell) => {
      if (!slug) return;
      setState(addDraftSell(slug, sell));
    },
    [slug],
  );

  const discardDraftBuy = useCallback(
    (draftId: string) => {
      if (!slug) return;
      setState(removeDraftBuy(slug, draftId));
    },
    [slug],
  );

  const discardDraftSell = useCallback(
    (draftId: string) => {
      if (!slug) return;
      setState(removeDraftSell(slug, draftId));
    },
    [slug],
  );

  return {
    draftBuys: state.buys,
    draftSells: state.sells,
    saveDraftBuy,
    saveDraftSell,
    discardDraftBuy,
    discardDraftSell,
  };
}
