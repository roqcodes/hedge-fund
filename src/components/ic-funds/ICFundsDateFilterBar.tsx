'use client';

import DateFilterBar from '@/components/ui/DateFilterBar';

type Props = {
  dateFilter: string;
  setDateFilter: (val: string) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
};

export default function ICFundsDateFilterBar({
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}: Props) {
  return (
    <DateFilterBar
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      customStartDate={customStartDate}
      setCustomStartDate={setCustomStartDate}
      customEndDate={customEndDate}
      setCustomEndDate={setCustomEndDate}
    />
  );
}
