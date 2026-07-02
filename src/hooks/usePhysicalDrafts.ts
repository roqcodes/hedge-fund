'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dbAddPhysicalDraftBuyAction,
  dbAddPhysicalDraftSellAction,
  dbDeletePhysicalDraftBuyAction,
  dbDeletePhysicalDraftSellAction,
  dbGetPhysicalDraftsAction,
} from '@/app/actions/physicalActions';
import {
  EMPTY_DRAFT_STATE,
  type PhysicalDraftBuy,
  type PhysicalDraftSell,
  type PhysicalDraftState,
} from '@/lib/physical/drafts';

/**
 * Per-branch draft store for physical deals, persisted in the database.
 *
 * Drafts live in dedicated tables and never affect balances, customer
 * ledgers/KYC, KPIs or the sellable-stock list — they simply persist across
 * refreshes and navigation until explicitly discarded. UI updates optimistically
 * and reconciles with the server on failure.
 */
export function usePhysicalDrafts(branchId: string | undefined) {
  const [state, setState] = useState<PhysicalDraftState>(EMPTY_DRAFT_STATE);
  const branchRef = useRef(branchId);
  branchRef.current = branchId;

  const reload = useCallback(async () => {
    if (!branchId) {
      setState(EMPTY_DRAFT_STATE);
      return;
    }
    const res = await dbGetPhysicalDraftsAction(branchId);
    if (res.success && res.data && branchRef.current === branchId) {
      setState(res.data);
    }
  }, [branchId]);

  useEffect(() => {
    let active = true;
    if (!branchId) {
      setState(EMPTY_DRAFT_STATE);
      return;
    }
    dbGetPhysicalDraftsAction(branchId).then(res => {
      if (active && res.success && res.data) setState(res.data);
    });
    return () => {
      active = false;
    };
  }, [branchId]);

  const saveDraftBuy = useCallback(
    async (buy: PhysicalDraftBuy) => {
      if (!branchId) return;
      setState(prev => ({ ...prev, buys: [buy, ...prev.buys] }));
      const res = await dbAddPhysicalDraftBuyAction(branchId, buy);
      if (!res.success) {
        alert(res.error || 'Failed to save draft');
        reload();
      }
    },
    [branchId, reload],
  );

  const saveDraftSell = useCallback(
    async (sell: PhysicalDraftSell) => {
      if (!branchId) return;
      setState(prev => ({ ...prev, sells: [sell, ...prev.sells] }));
      const res = await dbAddPhysicalDraftSellAction(branchId, sell);
      if (!res.success) {
        alert(res.error || 'Failed to save draft');
        reload();
      }
    },
    [branchId, reload],
  );

  const discardDraftBuy = useCallback(
    async (draftId: string) => {
      setState(prev => ({ ...prev, buys: prev.buys.filter(b => b.draftId !== draftId) }));
      const res = await dbDeletePhysicalDraftBuyAction(draftId);
      if (!res.success) {
        alert(res.error || 'Failed to discard draft');
        reload();
      }
    },
    [reload],
  );

  const discardDraftSell = useCallback(
    async (draftId: string) => {
      setState(prev => ({ ...prev, sells: prev.sells.filter(s => s.draftId !== draftId) }));
      const res = await dbDeletePhysicalDraftSellAction(draftId);
      if (!res.success) {
        alert(res.error || 'Failed to discard draft');
        reload();
      }
    },
    [reload],
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
