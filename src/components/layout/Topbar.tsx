'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import AppLogo from '@/components/layout/AppLogo';
import GlobalSearch from '@/components/layout/GlobalSearch';
import CurrencySwitcher from '@/components/ui/CurrencySwitcher';

type SearchFieldProps = {
  searchWrapRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  closeSearch: () => void;
  centered?: boolean;
};

function SearchField({
  searchWrapRef,
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  closeSearch,
  centered = false,
}: SearchFieldProps) {
  const searchOpen = isSearchOpen || searchQuery.length > 0;

  return (
    <div
      ref={searchWrapRef}
      className={`relative min-w-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        centered
          ? 'w-full max-w-xl'
          : `flex-1 max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-[60] max-md:px-4 max-md:pt-2.5 ${
              isSearchOpen
                ? 'max-md:translate-y-0 max-md:opacity-100'
                : 'max-md:pointer-events-none max-md:-translate-y-full max-md:opacity-0 md:opacity-100'
            }`
      }`}
    >
      <div
        className={`flex items-center gap-3 rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-sm shadow-surface-xs sm:px-4 sm:py-2.5 ${
          centered
            ? 'w-full'
            : `md:max-w-lg lg:max-w-xl ${
                searchOpen
                  ? 'max-md:rounded-2xl max-md:border max-md:border-slate-200 max-md:bg-white max-md:px-3 max-md:py-2.5 max-md:shadow-dropdown'
                  : ''
              }`
        }`}
      >
        <svg className="size-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Search pages, deals, transactions, products…"
          id="global-search"
          autoFocus={isSearchOpen && !centered}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchOpen(true)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          autoComplete="off"
          spellCheck={false}
        />
        {(searchOpen && !centered) || searchQuery ? (
          <button
            type="button"
            onClick={closeSearch}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-900"
          >
            {searchQuery ? 'Clear' : 'Cancel'}
          </button>
        ) : null}
        {centered && searchQuery ? (
          <button
            type="button"
            onClick={closeSearch}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-900"
          >
            Clear
          </button>
        ) : null}
      </div>

      <GlobalSearch
        query={searchQuery}
        open={searchOpen}
        onClose={closeSearch}
        onQueryChange={setSearchQuery}
      />
    </div>
  );
}

type TopbarActionsProps = {
  user: ReturnType<typeof useApp>['user'];
  logout: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  showMobileSearch?: boolean;
  onOpenMobileSearch?: () => void;
  hideOnMobileSearch?: boolean;
};

function TopbarActions({
  user,
  logout,
  isRefreshing,
  onRefresh,
  showMobileSearch = false,
  onOpenMobileSearch,
  hideOnMobileSearch = false,
}: TopbarActionsProps) {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4 transition-all duration-300 ${
        hideOnMobileSearch ? 'max-md:scale-0 max-md:opacity-0' : ''
      }`}
    >
      {showMobileSearch && onOpenMobileSearch ? (
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-all md:hidden"
          onClick={onOpenMobileSearch}
          aria-label="Open search"
        >
          <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      ) : null}

      <CurrencySwitcher />

      <button
        type="button"
        className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-[transform,colors,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-300 motion-safe:hover:bg-slate-50 motion-safe:hover:text-accent motion-safe:hover:shadow-surface motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] motion-safe:active:duration-150"
        onClick={onRefresh}
        aria-label="Refresh Data"
      >
        <svg className={`size-[18px] ${isRefreshing ? 'animate-spin text-accent' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      {user ? (
        <div className="group relative">
          <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-transparent p-1 transition-colors hover:bg-slate-50 md:gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-accent shadow-surface-xs ring-1 ring-slate-200/80">
              {(user.name || 'User')
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden min-w-0 text-left md:block">
              <div className="truncate text-sm font-semibold text-slate-900">{user.name || 'User'}</div>
              <div className="truncate text-[11px] font-medium capitalize text-slate-500">{(user.role || '').replace('_', ' ')}</div>
            </div>
          </div>

          <div className="invisible absolute right-0 top-[calc(100%+4px)] z-[300] w-64 origin-top-right scale-95 rounded-2xl border border-slate-200/90 bg-white p-2 opacity-0 shadow-dropdown transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:visible group-hover:scale-100 group-hover:opacity-100">
            <div className="mb-2 border-b border-slate-100 px-3 pb-3 pt-2">
              <div className="text-sm font-bold text-slate-900">{user.name || 'User'}</div>
              <div className="text-xs text-slate-500">{user.email || ''}</div>
            </div>
            <div className="px-3 py-2 text-xs text-slate-600">
              <div className="mb-2 flex justify-between">
                <span>Status</span>
                <span className="font-semibold text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Last Login</span>
                <span className="font-semibold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                onClick={logout}
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Topbar() {
  const {
    toggleSidebar,
    toggleSidebarCollapsed,
    sidebarCollapsed,
    logout,
    user,
    refetchData,
    hideMainSidebar,
    compactPortalHome,
  } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchData();
    setIsRefreshing(false);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        if (searchQuery) return;
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [searchQuery]);

  const searchOpen = isSearchOpen || searchQuery.length > 0;
  const headerShell =
    'min-h-14 shrink-0 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-surface-xs backdrop-blur-xl sm:min-h-[3.5rem] sm:px-5 md:px-6 lg:px-8';

  const searchProps = {
    searchWrapRef,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    closeSearch,
  };

  const actionsProps = {
    user,
    logout,
    isRefreshing,
    onRefresh: handleRefresh,
  };

  if (hideMainSidebar) {
    return (
      <header
        className={`max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:grid-rows-[auto_auto] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-2.5 sm:flex sm:items-center sm:gap-4 ${headerShell}`}
      >
        <div className="max-sm:col-start-1 max-sm:row-start-1 shrink-0">
          <AppLogo variant="header" href={compactPortalHome} />
        </div>

        <div className="max-sm:col-start-2 max-sm:row-start-1 shrink-0 sm:order-3">
          <TopbarActions {...actionsProps} />
        </div>

        <div className="max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-2 max-sm:min-w-0 sm:order-2 sm:min-w-0 sm:flex-1 sm:flex sm:justify-center sm:px-4">
          <SearchField {...searchProps} centered />
        </div>
      </header>
    );
  }

  return (
    <header className={`flex items-center justify-between gap-3 sm:gap-4 ${headerShell}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <button
          type="button"
          className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-[transform,colors,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 lg:flex"
          onClick={toggleSidebarCollapsed}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`size-5 shrink-0 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-[transform,colors,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 ${
            searchOpen ? 'max-md:scale-0 max-md:opacity-0' : ''
          } lg:hidden`}
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <SearchField {...searchProps} />
      </div>

      <TopbarActions
        {...actionsProps}
        showMobileSearch
        onOpenMobileSearch={() => setIsSearchOpen(true)}
        hideOnMobileSearch={searchOpen}
      />
    </header>
  );
}
