const base =
  'inline-flex items-center gap-1 rounded-full border border-white/50 px-2 py-0.5 text-[10px] font-bold tracking-wide before:block before:size-1 before:shrink-0 before:rounded-full before:bg-current sm:text-[11px] sm:before:size-1.5';

const tones: Record<string, string> = {
  profit: 'bg-emerald-50 text-emerald-700',
  loss: 'bg-red-50 text-red-700',
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
  completed: 'bg-emerald-50 text-emerald-700',
  transfer: 'bg-blue-50 text-blue-700',
  allocation: 'bg-violet-50 text-violet-700',
  expense: 'bg-amber-50 text-amber-700',
  capex: 'bg-violet-50 text-violet-700',
  opex: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
};

export function badgeClass(kind: string): string {
  return `${base} ${tones[kind] ?? tones.info}`;
}
