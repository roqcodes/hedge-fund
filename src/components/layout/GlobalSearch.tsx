'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  buildContextSearchResults,
  mergeSearchSections,
  normalizeSearchQuery,
  resolveBasePath,
  type GlobalSearchCategory,
  type GlobalSearchResult,
  type GlobalSearchSection,
} from '@/lib/globalSearch';
import { searchCatalogAction } from '@/app/actions/searchActions';

const CATEGORY_STYLES: Record<
  GlobalSearchCategory,
  { icon: React.ReactNode; accent: string; bg: string }
> = {
  pages: {
    accent: 'text-sky-600',
    bg: 'bg-sky-50 ring-sky-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  branches: {
    accent: 'text-violet-600',
    bg: 'bg-violet-50 ring-violet-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M3 21h18M5 21V7l7-4 7 4v14" />
      </svg>
    ),
  },
  groups: {
    accent: 'text-amber-600',
    bg: 'bg-amber-50 ring-amber-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  transactions: {
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50 ring-emerald-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    ),
  },
  entities: {
    accent: 'text-indigo-600',
    bg: 'bg-indigo-50 ring-indigo-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  investors: {
    accent: 'text-teal-600',
    bg: 'bg-teal-50 ring-teal-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  physical: {
    accent: 'text-orange-600',
    bg: 'bg-orange-50 ring-orange-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M12 7V3" />
      </svg>
    ),
  },
  products: {
    accent: 'text-rose-600',
    bg: 'bg-rose-50 ring-rose-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  marketplace: {
    accent: 'text-fuchsia-600',
    bg: 'bg-fuchsia-50 ring-fuchsia-600/15',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
};

function resultBadgeClass(tone: GlobalSearchResult['badgeTone']): string {
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  if (tone === 'info') return 'bg-sky-50 text-sky-700 ring-sky-600/20';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

type Props = {
  query: string;
  open: boolean;
  onClose: () => void;
  onQueryChange: (q: string) => void;
};

export default function GlobalSearch({ query, open, onClose, onQueryChange }: Props) {
  const router = useRouter();
  const {
    user,
    currentSlug,
    branches,
    transactions,
    entities,
    investors,
    deals,
    physicalBuys,
    selectInvestor,
  } = useApp();

  const [catalogSections, setCatalogSections] = useState<GlobalSearchSection[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const basePath = resolveBasePath(currentSlug);
  const isSuperadmin = user?.role === 'admin';
  const isBranchUser = user?.role === 'branch_manager';
  const branchId = user?.branchId;
  const catalogSlug = currentSlug !== 'superadmin' ? currentSlug : undefined;
  const hiddenPages = useMemo(() => {
    if (currentSlug === 'superadmin') return undefined;
    const branch = isBranchUser
      ? branches.find(b => b.id === branchId)
      : branches.find(b => b.slug === currentSlug);
    return branch?.hiddenPages;
  }, [currentSlug, isBranchUser, branchId, branches]);

  const contextSections = useMemo(() => {
    if (!normalizeSearchQuery(query)) return [];
    return buildContextSearchResults({
      query,
      basePath,
      currentSlug,
      isSuperadmin: !!isSuperadmin,
      isBranchUser: !!isBranchUser,
      branchId,
      hiddenPages,
      branches,
      transactions,
      entities,
      investors,
      deals,
      physicalBuys,
    });
  }, [
    query,
    basePath,
    currentSlug,
    isSuperadmin,
    isBranchUser,
    branchId,
    hiddenPages,
    branches,
    transactions,
    entities,
    investors,
    deals,
    physicalBuys,
  ]);

  const sections = useMemo(
    () => mergeSearchSections(contextSections, catalogSections),
    [contextSections, catalogSections],
  );

  const flatResults = useMemo(() => sections.flatMap(s => s.results), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, sections.length]);

  useEffect(() => {
    if (!open || !normalizeSearchQuery(query)) {
      setCatalogSections([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsCatalogLoading(true);
      const res = await searchCatalogAction(query, catalogSlug);
      if (res.success) setCatalogSections(res.sections);
      setIsCatalogLoading(false);
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, catalogSlug]);

  const navigateTo = useCallback(
    (result: GlobalSearchResult) => {
      if (result.category === 'investors' && result.href.includes('investor=')) {
        const id = result.href.split('investor=')[1]?.split('&')[0];
        if (id) selectInvestor(id);
      }
      router.push(result.href);
      onClose();
      onQueryChange('');
    },
    [router, onClose, onQueryChange, selectInvestor],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (flatResults.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % flatResults.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + flatResults.length) % flatResults.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = flatResults[activeIndex];
        if (target) navigateTo(target);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, flatResults, activeIndex, navigateTo, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const showPanel = open && normalizeSearchQuery(query).length > 0;
  let runningIndex = -1;

  if (!showPanel) return null;

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[200] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-dropdown">
      <div ref={listRef} className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
        {sections.length === 0 && !isCatalogLoading && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">No results for &ldquo;{query}&rdquo;</p>
            <p className="mt-1 text-xs text-slate-400">Try pages, deals, transactions, investors, products…</p>
          </div>
        )}

        {sections.map(section => {
          const style = CATEGORY_STYLES[section.category];
          return (
            <section key={section.category} className="border-b border-slate-100 last:border-b-0">
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-50 bg-white/95 px-3 py-2 backdrop-blur-sm">
                <span className={`inline-flex size-6 items-center justify-center rounded-lg ring-1 ring-inset ${style.bg} ${style.accent}`}>
                  {style.icon}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{section.label}</span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {section.results.length}
                </span>
              </div>
              <ul className="py-1">
                {section.results.map(result => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isActive = idx === activeIndex;
                  return (
                    <li key={result.id}>
                      <button
                        type="button"
                        data-active={isActive ? 'true' : 'false'}
                        className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                          isActive ? 'bg-accent/[0.06]' : 'hover:bg-slate-50'
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigateTo(result)}
                      >
                        <span
                          className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.bg} ${style.accent}`}
                        >
                          {style.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">{result.title}</span>
                            {result.badge && (
                              <span
                                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold capitalize ring-1 ring-inset ${resultBadgeClass(result.badgeTone)}`}
                              >
                                {result.badge}
                              </span>
                            )}
                          </span>
                          {result.subtitle && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">{result.subtitle}</span>
                          )}
                          {result.meta && (
                            <span className="mt-1 block truncate text-[11px] font-mono font-semibold text-slate-600">
                              {result.meta}
                            </span>
                          )}
                        </span>
                        <svg className="mt-1 size-4 shrink-0 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {isCatalogLoading && (
          <div className="border-t border-slate-100 px-4 py-3 text-center text-xs font-medium text-slate-400">
            Searching products & marketplace…
          </div>
        )}
      </div>

      {flatResults.length > 0 && (
        <div className="hidden border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] font-medium text-slate-400 sm:flex sm:items-center sm:gap-3">
          <span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-500">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-500">Enter</kbd> open
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-500">Esc</kbd> close
          </span>
        </div>
      )}
    </div>
  );
}
