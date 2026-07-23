'use client';

import { useCallback, useRef, useState } from 'react';
import ConfirmModal, { type ConfirmModalVariant } from '@/components/ui/ConfirmModal';

type DialogState = {
  open: boolean;
  mode: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmLabel: string;
  variant: ConfirmModalVariant;
  loading: boolean;
};

const closedState: DialogState = {
  open: false,
  mode: 'confirm',
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  variant: 'danger',
  loading: false,
};

type Pending = {
  mode: 'confirm' | 'alert';
  resolve: (value: boolean) => void;
};

export function useConfirmDialog() {
  const [state, setState] = useState<DialogState>(closedState);
  const pendingRef = useRef<Pending | null>(null);

  const finish = useCallback((result: boolean) => {
    pendingRef.current?.resolve(result);
    pendingRef.current = null;
    setState(closedState);
  }, []);

  const confirm = useCallback((opts: {
    title?: string;
    message: string;
    confirmLabel?: string;
    variant?: ConfirmModalVariant;
  }): Promise<boolean> => {
    return new Promise(resolve => {
      pendingRef.current = { mode: 'confirm', resolve };
      setState({
        open: true,
        mode: 'confirm',
        title: opts.title ?? 'Are you sure?',
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Delete',
        variant: opts.variant ?? 'danger',
        loading: false,
      });
    });
  }, []);

  const alert = useCallback((opts: {
    title?: string;
    message: string;
    variant?: ConfirmModalVariant;
  }): Promise<void> => {
    return new Promise(resolve => {
      pendingRef.current = {
        mode: 'alert',
        resolve: () => resolve(),
      };
      setState({
        open: true,
        mode: 'alert',
        title: opts.title ?? 'Cannot delete',
        message: opts.message,
        confirmLabel: 'OK',
        variant: opts.variant ?? 'warning',
        loading: false,
      });
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(s => ({ ...s, loading }));
  }, []);

  function Dialog() {
    return (
      <ConfirmModal
        open={state.open}
        mode={state.mode}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        variant={state.variant}
        loading={state.loading}
        onConfirm={() => finish(true)}
        onCancel={() => finish(state.mode === 'alert')}
      />
    );
  }

  return { confirm, alert, setLoading, Dialog };
}
