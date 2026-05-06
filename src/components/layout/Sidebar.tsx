'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const navItems = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'branches', path: '/branches', label: 'Branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'funds', path: '/funds', label: 'Fund Management', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { id: 'finance', path: '/finance', label: 'Finance', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'reports', path: '/reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'invoices', path: '/invoices', label: 'Invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, user } = useApp();
  const pathname = usePathname();

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={toggleSidebar} />
      <aside className={`sidebar ${sidebarOpen ? 'open desktop-collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">H</div>
          <div className="logo-text">
            <h1>HEDGE</h1>
            <span>Capital Management</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => {
            const isActive = pathname === item.path || (pathname === '/' && item.id === 'dashboard');
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => { if (window.innerWidth <= 768 && sidebarOpen) toggleSidebar(); }}
                id={`nav-${item.id}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          {user && (
            <>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 2 }}>{user.name}</div>
              <div style={{ textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
