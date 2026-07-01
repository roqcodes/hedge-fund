'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

type ICTransferFilterContextValue = {
  selectedRegionIds: string[];
  setSelectedRegionIds: (ids: string[]) => void;
};

const ICTransferFilterContext = createContext<ICTransferFilterContextValue | null>(null);

export function ICTransferFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);

  const value = useMemo(
    () => ({ selectedRegionIds, setSelectedRegionIds }),
    [selectedRegionIds],
  );

  return (
    <ICTransferFilterContext.Provider value={value}>{children}</ICTransferFilterContext.Provider>
  );
}

export function useICTransferRegionFilter() {
  const ctx = useContext(ICTransferFilterContext);
  if (!ctx) {
    throw new Error('useICTransferRegionFilter must be used within ICTransferFilterProvider');
  }
  return ctx;
}
