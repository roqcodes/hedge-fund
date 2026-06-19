import { Transaction } from '@/types';
import { getTransactionTagNames } from '@/lib/transactionTags';

export function TransactionTagsCell({ transaction: t }: { transaction: Transaction }) {
  const tags = getTransactionTagNames(t);

  return (
    <div className="flex flex-wrap gap-1">
      {tags.length === 0 ? (
        <span className="text-slate-300">—</span>
      ) : (
        tags.map(tag => (
          <span
            key={tag}
            className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
          >
            {tag}
          </span>
        ))
      )}
    </div>
  );
}
