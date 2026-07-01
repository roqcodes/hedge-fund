'use client';

import React from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useApp } from '@/context/AppContext';
import RegionMultiSelect from './RegionMultiSelect';
import { useICTransferRegionFilter } from './ICTransferFilterProvider';

type Props = {
  dateFilter: string;
  setDateFilter: (val: string) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
};

export default function ICTransferDateFilterBar({
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}: Props) {
  const { icRegions } = useApp();
  const { selectedRegionIds, setSelectedRegionIds } = useICTransferRegionFilter();

  return (
    <DateFilterBar
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      customStartDate={customStartDate}
      setCustomStartDate={setCustomStartDate}
      customEndDate={customEndDate}
      setCustomEndDate={setCustomEndDate}
    >
      <RegionMultiSelect
        regions={icRegions}
        selectedIds={selectedRegionIds}
        onChange={setSelectedRegionIds}
        placeholder="All regions"
        compact
        inline
        className="w-full"
      />
    </DateFilterBar>
  );
}
