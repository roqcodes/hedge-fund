import { fmtICTime, voucherUserLabel } from '@/lib/icFunds/format';
import type { ICFundVoucher } from '@/types';

export default function VoucherUserCell({
  voucher,
}: {
  voucher: Pick<ICFundVoucher, 'createdByName' | 'createdBy' | 'createdAt'>;
}) {
  const name = voucherUserLabel(voucher);
  if (name === '—') {
    return <span className="text-slate-400">—</span>;
  }

  const time = fmtICTime(voucher.createdAt);

  return (
    <div className="min-w-0 max-w-[9rem]">
      <div className="truncate text-sm text-slate-700" title={name}>{name}</div>
      {time ? (
        <div className="truncate text-[11px] text-slate-400" title={time}>{time}</div>
      ) : null}
    </div>
  );
}
