'use client';

import { useLayoutEffect } from 'react';
import { useApp } from '@/context/AppContext';

/** Collapses the main sidebar before paint when entering IC Transfer routes. */
export default function ICTransferModeEffect() {
  const { setSidebarCollapsed } = useApp();

  useLayoutEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  return null;
}
