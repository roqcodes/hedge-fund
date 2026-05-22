'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DateRange } from '@/types';

export default function Topbar() {
  const { notifications, toggleSidebar, logout, user } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;


  return (
    <header className="sticky top-0 z-50 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-surface-xs backdrop-blur-xl sm:min-h-[3.5rem] sm:gap-4 sm:px-5 md:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <button
          type="button"
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-all duration-300 ${
            isSearchOpen ? 'max-md:scale-0 max-md:opacity-0' : ''
          } lg:hidden`}
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <div
          className={`min-w-0 flex-1 items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-[60] max-md:flex max-md:h-14 max-md:bg-white max-md:px-4 ${
            isSearchOpen
              ? 'max-md:translate-y-0 max-md:opacity-100'
              : 'max-md:pointer-events-none max-md:-translate-y-full max-md:opacity-0 md:flex md:max-w-lg md:rounded-full md:border md:border-slate-200/90 md:bg-slate-50/90 md:px-4 md:py-2.5 md:text-sm md:shadow-surface-xs lg:max-w-xl'
          }`}
        >
          <svg className="size-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search branches, transactions..."
            id="global-search"
            autoFocus={isSearchOpen}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
          {isSearchOpen && (
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-900 md:hidden"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className={`flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4 transition-all duration-300 ${
        isSearchOpen ? 'max-md:scale-0 max-md:opacity-0' : ''
      }`}>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-all md:hidden"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Open search"
        >
          <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>

        <div className="relative">
          <button
            type="button"
            className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-[transform,colors,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-300 motion-safe:hover:bg-slate-50 motion-safe:hover:text-accent motion-safe:hover:shadow-surface motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] motion-safe:active:duration-150"
            onClick={() => setNotifOpen(!notifOpen)}
            id="notifications-btn"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-white bg-accent text-[9px] font-extrabold text-white shadow-surface-xs">
                {unreadCount}
              </span>
            )}
          </button>
          <div
            className={`absolute -right-12 top-[calc(100%+12px)] z-[300] w-[calc(100vw-32px)] origin-top-right rounded-2xl border border-slate-200/90 bg-white text-sm shadow-dropdown transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:right-0 sm:w-[380px] ${
              notifOpen
                ? 'visible scale-100 opacity-100'
                : 'invisible scale-95 opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900">
              Notifications
            </div>
            <ul className="max-h-[min(80dvh,400px)] overflow-y-auto overscroll-contain text-xs sm:text-sm">
              {notifications.map(n => (
                <li
                  key={n.id}
                  className={`flex gap-2 border-b border-slate-100 px-4 py-3 transition-[background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:bg-slate-50 ${
                    !n.read ? 'bg-accent/[0.06]' : ''
                  }`}
                >
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />}
                  <div className={!n.read ? '' : 'pl-5'}>
                    <div className="mb-1 font-semibold text-slate-900">{n.message}</div>
                    <div className="text-xs font-medium text-slate-500">{n.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {user && (
          <div className="group relative">
            <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-transparent p-1 transition-colors hover:bg-slate-50 md:gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-accent shadow-surface-xs ring-1 ring-slate-200/80">
                {user.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="hidden min-w-0 text-left md:block">
                <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="truncate text-[11px] font-medium capitalize text-slate-500">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
            
            <div className="invisible absolute right-0 top-[calc(100%+4px)] z-[300] w-64 origin-top-right scale-95 rounded-2xl border border-slate-200/90 bg-white p-2 opacity-0 shadow-dropdown transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:visible group-hover:scale-100 group-hover:opacity-100">
              <div className="mb-2 border-b border-slate-100 px-3 pb-3 pt-2">
                <div className="text-sm font-bold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
              <div className="px-3 py-2 text-xs text-slate-600">
                <div className="mb-2 flex justify-between">
                  <span>Status</span>
                  <span className="font-semibold text-green-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Login</span>
                  <span className="font-semibold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
        )}
      </div>
    </header>
  );
}
