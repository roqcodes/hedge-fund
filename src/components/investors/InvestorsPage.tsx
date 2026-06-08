'use client';
import React, { useMemo, useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp, AddInvestorInput } from '@/context/AppContext';
import { formatAED, formatDate, formatDateTime, investorTotalExposure } from '@/data/mockData';
import { Branch, Investor, InvestorRiskProfile } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  btnSm,
  filterChip,
  filterChipActive,
  formGroup,
  formHint,
  formInput,
  formLabel,
  formRow,
  formSelect,
  formTextarea,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function InvestorsPage() {
  const { investors, branches, selectedInvestorId, selectInvestor, addInvestor, updateInvestor } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | Investor['status']>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return investors.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.name.toLowerCase().includes(q) ||
        inv.email.toLowerCase().includes(q) ||
        inv.nationality.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q)
      );
    });
  }, [investors, statusFilter, search]);

  const totalCash = investors.reduce((s, i) => s + i.cashDeposit, 0);
  const totalGold = investors.reduce((s, i) => s + i.goldDeposit, 0);
  const activeCount = investors.filter(i => i.status === 'active').length;

  const selected = selectedInvestorId ? investors.find(i => i.id === selectedInvestorId) : null;

  if (selected) {
    return (
      <>
        <InvestorProfile
          investor={selected}
          onBack={() => selectInvestor(null)}
          onEdit={() => setShowEdit(true)}
        />
        <EditInvestorModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          branches={branches}
          investor={selected}
          updateInvestor={updateInvestor}
        />
      </>
    );
  }

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Investors</h2>
            <p className={pageSubtitle}>
              {investors.length} registered investors — {activeCount} active portfolios
            </p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowCreate(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Add Investor
          </button>
        </div>

        <div className={kpiGrid}>
          <KPICard
            label="Total Investors"
            value={investors.length}
            subValue={`${activeCount} active · ${investors.filter(i => i.status === 'pending').length} pending`}
            icon={<span aria-hidden>👥</span>}
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Cash Deposits"
            value={formatAED(totalCash)}
            subValue="Aggregate cash positions"
            icon={<span aria-hidden>💵</span>}
            color="#2563eb"
            bgColor="rgba(37, 99, 235, 0.1)"
          />
          <KPICard
            label="Gold Deposits"
            value={formatAED(totalGold)}
            subValue="AED equivalent held"
            icon={<span aria-hidden>🥇</span>}
            color="#d97706"
            bgColor="rgba(217, 119, 6, 0.1)"
          />
          <KPICard
            label="Total Exposure"
            value={formatAED(totalCash + totalGold)}
            subValue="Cash + gold combined"
            icon={<span aria-hidden>📊</span>}
            color="var(--profit)"
            bgColor="var(--profit-light)"
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="investor-search" className="sr-only">
                Search investors
              </label>
              <input
                id="investor-search"
                type="search"
                className={formInput}
                placeholder="Search name, email, ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div
              className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="Filter by status"
            >
              {(['all', 'active', 'pending', 'inactive'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  className={`shrink-0 capitalize ${statusFilter === s ? filterChipActive : filterChip}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <InvestorMobileList investors={filtered} onSelect={selectInvestor} />

          <div className="hidden p-0 md:block">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[900px]`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Investor</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Cash Deposit</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Gold Deposit</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Total</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">KYC</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 first:rounded-l-2xl sm:px-5 sm:py-4">
                        <div className="text-sm font-bold text-slate-900">{inv.name}</div>
                        <div className="text-xs font-medium text-slate-500">{inv.email}</div>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4">
                        {formatAED(inv.cashDeposit)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <div className="font-mono text-sm font-bold">{formatAED(inv.goldDeposit)}</div>
                        {inv.goldWeightGrams > 0 && (
                          <div className="text-[11px] font-medium text-amber-700">{inv.goldWeightGrams} g</div>
                        )}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold text-slate-900 sm:px-5 sm:py-4">
                        {formatAED(investorTotalExposure(inv))}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(inv.kycStatus)}>{inv.kycStatus}</span>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(inv.status)}>{inv.status}</span>
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                        <button type="button" className={`${btnGhost} ${btnSm} !font-bold`} onClick={() => selectInvestor(inv.id)}>
                          View profile
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm font-medium text-slate-500">
                        No investors match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AddInvestorModal open={showCreate} onClose={() => setShowCreate(false)} branches={branches} addInvestor={addInvestor} />
    </>
  );
}

function InvestorProfile({
  investor,
  onBack,
  onEdit,
}: {
  investor: Investor;
  onBack: () => void;
  onEdit: () => void;
}) {
  const total = investorTotalExposure(investor);

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-surface-xs transition hover:bg-slate-50 sm:w-auto"
          onClick={onBack}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M19 12H5m0 0l7-7m-7 7l7 7" />
          </svg>
          Back to investors
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-surface-xs transition hover:bg-slate-50 sm:w-auto"
          onClick={onEdit}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mr-1">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Profile
        </button>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-surface sm:mb-8 sm:rounded-3xl sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 text-xl font-black text-accent ring-1 ring-accent/10 sm:size-20 sm:text-2xl">
            {investor.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">{investor.name}</h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
              <span className="block">{investor.id}</span>
              <span className="block">Joined {formatDate(investor.joinedDate)}</span>
              <span className="block">Last activity {formatDateTime(investor.lastActivity)}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={badgeClass(investor.status)}>{investor.status}</span>
              <span className={badgeClass(investor.kycStatus)}>KYC {investor.kycStatus}</span>
              <span className={badgeClass(investor.riskProfile)}>{investor.riskProfile} risk</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid w-full min-w-0 grid-cols-1 gap-2 border-t border-slate-100 pt-5 md:grid-cols-3 md:gap-3">
          <ProfileStat label="Cash" value={formatAED(investor.cashDeposit)} valueClassName="text-slate-900" />
          <ProfileStat
            label="Gold"
            value={formatAED(investor.goldDeposit)}
            subValue={investor.goldWeightGrams > 0 ? `${investor.goldWeightGrams} g` : undefined}
            valueClassName="text-amber-700"
          />
          <ProfileStat label="Total" value={formatAED(total)} valueClassName="text-accent" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ProfileSection title="Contact & identity">
          <ProfileRow label="Email" value={investor.email} />
          <ProfileRow label="Phone" value={investor.phone} />
          <ProfileRow label="Preferred contact" value={investor.preferredContact} />
          <ProfileRow label="Nationality" value={investor.nationality} />
          {investor.emiratesId && <ProfileRow label="Emirates ID" value={investor.emiratesId} />}
          {investor.passportNo && <ProfileRow label="Passport" value={investor.passportNo} />}
          <ProfileRow label="Address" value={`${investor.address}, ${investor.city}, ${investor.country}`} />
        </ProfileSection>

        <ProfileSection title="Portfolio & assignment">
          <ProfileRow label="Risk profile" value={investor.riskProfile} />
          <ProfileRow
            label="Assigned branch"
            value={investor.assignedBranchName ?? '—'}
          />
          {investor.notes && <ProfileRow label="Notes" value={investor.notes} />}
        </ProfileSection>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-surface sm:rounded-3xl">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-8 sm:py-5">
          <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">Deposit history</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{investor.depositHistory.length} recorded deposits</p>
        </div>
        <div className="p-0">
          {investor.depositHistory.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm font-medium text-slate-500 sm:px-8">No deposits recorded yet.</p>
          ) : (
            <>
              <div className="space-y-2 p-4 md:hidden">
                {investor.depositHistory.map(dep => (
                  <div key={dep.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={badgeClass(dep.type === 'cash' ? 'allocation' : 'pending')}>
                        {dep.type === 'cash' ? 'Cash' : 'Gold'}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{formatDate(dep.date)}</span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-900">{formatAED(dep.amount)}</p>
                    {dep.goldGrams != null && dep.goldGrams > 0 && (
                      <p className="mt-0.5 text-xs font-medium text-amber-700">{dep.goldGrams} g gold</p>
                    )}
                    {dep.notes && <p className="mt-2 text-xs text-slate-600">{dep.notes}</p>}
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <div className={tableWrap}>
                  <table className={`${dataTable} min-w-[560px]`}>
                    <thead>
                      <tr>
                        <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Date</th>
                        <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Type</th>
                        <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Amount</th>
                        <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Gold (g)</th>
                        <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investor.depositHistory.map(dep => (
                        <tr key={dep.id} data-interactive-row>
                          <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm first:rounded-l-2xl sm:px-5 sm:py-4">
                            {formatDate(dep.date)}
                          </td>
                          <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                            <span className={badgeClass(dep.type === 'cash' ? 'allocation' : 'pending')}>
                              {dep.type === 'cash' ? 'Cash' : 'Gold'}
                            </span>
                          </td>
                          <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4">
                            {formatAED(dep.amount)}
                          </td>
                          <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4">
                            {dep.goldGrams ?? '—'}
                          </td>
                          <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-sm text-slate-600 last:rounded-r-2xl sm:px-5 sm:py-4">
                            {dep.notes ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InvestorMobileList({
  investors,
  onSelect,
}: {
  investors: Investor[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3 p-4 md:hidden">
      {investors.map(inv => (
        <article key={inv.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-surface-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-slate-900">{inv.name}</h4>
              <p className="truncate text-xs font-medium text-slate-500">{inv.email}</p>
            </div>
            <span className={badgeClass(inv.status)}>{inv.status}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash</dt>
              <dd className="mt-0.5 truncate font-mono text-sm font-bold text-slate-900">{formatAED(inv.cashDeposit)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gold</dt>
              <dd className="mt-0.5 font-mono text-sm font-bold text-amber-700">
                {formatAED(inv.goldDeposit)}
                {inv.goldWeightGrams > 0 && (
                  <span className="block text-[10px] font-medium text-amber-600/90">{inv.goldWeightGrams} g</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</dt>
              <dd className="mt-0.5 truncate font-mono text-sm font-bold text-accent">{formatAED(investorTotalExposure(inv))}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KYC</dt>
              <dd className="mt-1">
                <span className={badgeClass(inv.kycStatus)}>{inv.kycStatus}</span>
              </dd>
            </div>
          </dl>
          <button type="button" className={`${btnPrimary} mt-4 w-full`} onClick={() => onSelect(inv.id)}>
            View profile
          </button>
        </article>
      ))}
      {investors.length === 0 && (
        <p className="py-10 text-center text-sm font-medium text-slate-500">No investors match your filters.</p>
      )}
    </div>
  );
}

function ProfileStat({
  label,
  value,
  subValue,
  valueClassName = 'text-slate-900',
}: {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50/90 px-3.5 py-3 sm:rounded-2xl sm:px-4 sm:py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-[11px]">{label}</p>
      <div
        className={`mt-1 break-all font-mono text-xs font-extrabold tabular-nums leading-tight sm:text-sm md:break-normal md:truncate md:text-base lg:text-lg ${valueClassName}`}
        title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
      >
        {value}
      </div>
      {subValue && <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subValue}</p>}
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-surface sm:rounded-3xl sm:p-6">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium capitalize text-slate-900 sm:max-w-[60%] sm:text-right">{value}</dd>
    </div>
  );
}

function AddInvestorModal({
  open,
  onClose,
  branches,
  addInvestor,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  addInvestor: (input: AddInvestorInput) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [emiratesId, setEmiratesId] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United Arab Emirates');
  const [cashDeposit, setCashDeposit] = useState('');
  const [goldDeposit, setGoldDeposit] = useState('');
  const [goldGrams, setGoldGrams] = useState('');
  const [riskProfile, setRiskProfile] = useState<InvestorRiskProfile>('balanced');
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone' | 'whatsapp'>('email');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setNationality('');
    setEmiratesId('');
    setPassportNo('');
    setAddress('');
    setCity('');
    setCountry('United Arab Emirates');
    setCashDeposit('');
    setGoldDeposit('');
    setGoldGrams('');
    setRiskProfile('balanced');
    setPreferredContact('email');
    setBranchId('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!name || !email || !phone || !nationality || !address || !city || !country) return;
    addInvestor({
      name,
      email,
      phone,
      nationality,
      emiratesId: emiratesId || undefined,
      passportNo: passportNo || undefined,
      address,
      city,
      country,
      cashDeposit: Number(cashDeposit) || 0,
      goldDeposit: Number(goldDeposit) || 0,
      goldWeightGrams: Number(goldGrams) || 0,
      riskProfile,
      preferredContact,
      assignedBranchId: branchId || undefined,
      notes: notes || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add new investor"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={handleSubmit}>
            Create investor
          </button>
        </>
      }
    >
      <p className="mb-5 text-sm font-medium text-slate-500">Register an investor with contact details and initial deposit positions.</p>

      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Personal details</h4>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-name">
            Full name *
          </label>
          <input id="inv-name" className={formInput} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-nationality">
            Nationality *
          </label>
          <input id="inv-nationality" className={formInput} value={nationality} onChange={e => setNationality(e.target.value)} />
        </div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-emirates">
            Emirates ID
          </label>
          <input id="inv-emirates" className={formInput} value={emiratesId} onChange={e => setEmiratesId(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-passport">
            Passport no.
          </label>
          <input id="inv-passport" className={formInput} value={passportNo} onChange={e => setPassportNo(e.target.value)} />
        </div>
      </div>

      <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Contact</h4>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-email">
            Email *
          </label>
          <input id="inv-email" type="email" className={formInput} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-phone">
            Phone *
          </label>
          <input id="inv-phone" className={formInput} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel} htmlFor="inv-pref">
          Preferred contact
        </label>
        <select id="inv-pref" className={formSelect} value={preferredContact} onChange={e => setPreferredContact(e.target.value as typeof preferredContact)}>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
      <div className={formGroup}>
        <label className={formLabel} htmlFor="inv-address">
          Street address *
        </label>
        <input id="inv-address" className={formInput} value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-city">
            City *
          </label>
          <input id="inv-city" className={formInput} value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-country">
            Country *
          </label>
          <input id="inv-country" className={formInput} value={country} onChange={e => setCountry(e.target.value)} />
        </div>
      </div>

      <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Deposits</h4>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-cash">
            Cash deposit (AED)
          </label>
          <input id="inv-cash" type="number" min={0} className={formInput} value={cashDeposit} onChange={e => setCashDeposit(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-gold">
            Gold deposit (AED value)
          </label>
          <input id="inv-gold" type="number" min={0} className={formInput} value={goldDeposit} onChange={e => setGoldDeposit(e.target.value)} />
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel} htmlFor="inv-grams">
          Gold weight (grams)
        </label>
        <input id="inv-grams" type="number" min={0} className={formInput} value={goldGrams} onChange={e => setGoldGrams(e.target.value)} />
        <p className={formHint}>Optional — physical gold weight on intake</p>
      </div>

      <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Portfolio</h4>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-risk">
            Risk profile
          </label>
          <select id="inv-risk" className={formSelect} value={riskProfile} onChange={e => setRiskProfile(e.target.value as InvestorRiskProfile)}>
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="inv-branch">
            Assigned branch
          </label>
          <select id="inv-branch" className={formSelect} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">— None —</option>
            {branches.filter(b => b.status === 'active').map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel} htmlFor="inv-notes">
          Internal notes
        </label>
        <textarea id="inv-notes" className={formTextarea} rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}

function EditInvestorModal({
  open,
  onClose,
  investor,
  branches,
  updateInvestor,
}: {
  open: boolean;
  onClose: () => void;
  investor: Investor;
  branches: Branch[];
  updateInvestor: (investor: Investor) => void;
}) {
  const { deleteInvestor, deals } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState(investor.name);
  const [email, setEmail] = useState(investor.email);
  const [phone, setPhone] = useState(investor.phone);
  const [nationality, setNationality] = useState(investor.nationality);
  const [emiratesId, setEmiratesId] = useState(investor.emiratesId || '');
  const [passportNo, setPassportNo] = useState(investor.passportNo || '');
  const [address, setAddress] = useState(investor.address);
  const [city, setCity] = useState(investor.city);
  const [country, setCountry] = useState(investor.country);
  const [status, setStatus] = useState<Investor['status']>(investor.status);
  const [kycStatus, setKycStatus] = useState<Investor['kycStatus']>(investor.kycStatus);
  const [riskProfile, setRiskProfile] = useState<Investor['riskProfile']>(investor.riskProfile);
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone' | 'whatsapp'>(investor.preferredContact);
  const [branchId, setBranchId] = useState(investor.assignedBranchId || '');
  const [notes, setNotes] = useState(investor.notes || '');

  React.useEffect(() => {
    if (open) {
      setName(investor.name);
      setEmail(investor.email);
      setPhone(investor.phone);
      setNationality(investor.nationality);
      setEmiratesId(investor.emiratesId || '');
      setPassportNo(investor.passportNo || '');
      setAddress(investor.address);
      setCity(investor.city);
      setCountry(investor.country);
      setStatus(investor.status);
      setKycStatus(investor.kycStatus);
      setRiskProfile(investor.riskProfile);
      setPreferredContact(investor.preferredContact);
      setBranchId(investor.assignedBranchId || '');
      setNotes(investor.notes || '');
    }
  }, [open, investor]);

  const handleSubmit = () => {
    if (!name || !email || !phone || !nationality || !address || !city || !country) return;
    updateInvestor({
      ...investor,
      name,
      email,
      phone,
      nationality,
      emiratesId: emiratesId || undefined,
      passportNo: passportNo || undefined,
      address,
      city,
      country,
      status,
      kycStatus,
      riskProfile,
      preferredContact,
      assignedBranchId: branchId || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  const hasDeals = deals.some(d => d.investors.some(inv => inv.investorId === investor.id));

  const handleDelete = async () => {
    if (hasDeals) return;
    if (confirm(`Are you sure you want to delete ${investor.name}? This action cannot be undone.`)) {
      setIsDeleting(true);
      const success = await deleteInvestor(investor.id);
      setIsDeleting(false);
      if (success) onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit investor details"
      footer={
        <div className="flex w-full items-center justify-between gap-4">
          <button 
            type="button" 
            className={`px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${hasDeals ? 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50' : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'}`}
            onClick={hasDeals ? undefined : handleDelete}
            disabled={hasDeals || isDeleting}
            title={hasDeals ? "Cannot delete investor because they are involved in active deals or groups." : "Delete this investor"}
          >
            {isDeleting ? 'Deleting...' : 'Delete Investor'}
          </button>
          <div className="flex items-center gap-3">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} onClick={handleSubmit}>
              Save changes
            </button>
          </div>
        </div>
      }
    >
      <p className="mb-5 text-sm font-medium text-slate-500">Modify the contact, identity, status, or portfolio assignment for this investor.</p>

      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Personal details</h4>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-name">
            Full name *
          </label>
          <input id="edit-inv-name" className={formInput} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-nationality">
            Nationality *
          </label>
          <input id="edit-inv-nationality" className={formInput} value={nationality} onChange={e => setNationality(e.target.value)} />
        </div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-emirates">
            Emirates ID
          </label>
          <input id="edit-inv-emirates" className={formInput} value={emiratesId} onChange={e => setEmiratesId(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-passport">
            Passport no.
          </label>
          <input id="edit-inv-passport" className={formInput} value={passportNo} onChange={e => setPassportNo(e.target.value)} />
        </div>
      </div>

      <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Contact</h4>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-email">
            Email *
          </label>
          <input id="edit-inv-email" type="email" className={formInput} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-phone">
            Phone *
          </label>
          <input id="edit-inv-phone" className={formInput} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel} htmlFor="edit-inv-pref">
          Preferred contact
        </label>
        <select id="edit-inv-pref" className={formSelect} value={preferredContact} onChange={e => setPreferredContact(e.target.value as typeof preferredContact)}>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
      <div className={formGroup}>
        <label className={formLabel} htmlFor="edit-inv-address">
          Street address *
        </label>
        <input id="edit-inv-address" className={formInput} value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-city">
            City *
          </label>
          <input id="edit-inv-city" className={formInput} value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-country">
            Country *
          </label>
          <input id="edit-inv-country" className={formInput} value={country} onChange={e => setCountry(e.target.value)} />
        </div>
      </div>

      <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Portfolio & Status</h4>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-status">
            Status
          </label>
          <select id="edit-inv-status" className={formSelect} value={status} onChange={e => setStatus(e.target.value as Investor['status'])}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-kyc">
            KYC Status
          </label>
          <select id="edit-inv-kyc" className={formSelect} value={kycStatus} onChange={e => setKycStatus(e.target.value as Investor['kycStatus'])}>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-risk">
            Risk profile
          </label>
          <select id="edit-inv-risk" className={formSelect} value={riskProfile} onChange={e => setRiskProfile(e.target.value as Investor['riskProfile'])}>
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        <div className={formGroup}>
          <label className={formLabel} htmlFor="edit-inv-branch">
            Assigned branch
          </label>
          <select id="edit-inv-branch" className={formSelect} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">— None —</option>
            {branches.filter(b => b.status === 'active').map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel} htmlFor="edit-inv-notes">
          Internal notes
        </label>
        <textarea id="edit-inv-notes" className={formTextarea} rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
