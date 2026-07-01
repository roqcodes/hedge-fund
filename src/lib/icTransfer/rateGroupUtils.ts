import type { ICRateGroup } from '@/types';

export function isRateGroupUpdatedToday(updatedAt?: string | null): boolean {
  if (!updatedAt) return false;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function sortRateGroupsForTable(groups: ICRateGroup[]): ICRateGroup[] {
  return [...groups].sort((a, b) => {
    const aStale = !isRateGroupUpdatedToday(a.updatedAt);
    const bStale = !isRateGroupUpdatedToday(b.updatedAt);
    if (aStale !== bStale) return aStale ? -1 : 1;

    if (aStale && bStale) {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
    }

    return a.name.localeCompare(b.name);
  });
}

export function formatRateGroupUpdatedAt(updatedAt?: string | null): string {
  if (!updatedAt) return 'Never';
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
