import { Transaction } from '@/types';

export function TransactionNotesCell({
  transaction: t,
  className = '',
}: {
  transaction: Transaction;
  className?: string;
}) {
  const asset = t.assetType === 'gold' ? 'Gold' : 'AED';
  const notes = t.notes?.trim();
  const assetClass =
    t.assetType === 'gold' ? 'font-semibold text-amber-700' : 'font-semibold text-slate-500';

  return (
    <div className={`min-w-0 max-w-[420px] ${className}`}>
      <p className="text-sm leading-snug text-slate-700 break-words whitespace-normal">
        <span className={`text-xs uppercase tracking-wide ${assetClass}`}>{asset}</span>
        {notes ? (
          <>
            <span className="text-slate-300"> · </span>
            {notes}
          </>
        ) : (
          <span className="text-slate-400"> · —</span>
        )}
      </p>
    </div>
  );
}
