'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import LoginPage from '@/components/auth/LoginPage';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialLoading, toasts, sidebarOpen } = useApp();

  if (isInitialLoading) return null; // Or a professional loading spinner
  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`main-area ${sidebarOpen ? 'desktop-collapsed' : ''}`}>
        <Topbar />
        <main className="page-content">{children}</main>
      </div>
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}
