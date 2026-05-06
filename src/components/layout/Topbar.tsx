'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DateRange } from '@/types';

const dateOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function Topbar() {
  const { dateRange, setDateRange, notifications, toggleSidebar, logout } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Search branches, transactions..." id="global-search" />
        </div>
      </div>
      <div className="topbar-right">
        <div className="date-selector">
          {dateOptions.map(opt => (
            <button
              key={opt.value}
              className={`date-btn ${dateRange === opt.value ? 'active' : ''}`}
              onClick={() => setDateRange(opt.value)}
              id={`date-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <button className="notif-btn" onClick={() => setNotifOpen(!notifOpen)} id="notifications-btn" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
          <div className={`notif-dropdown ${notifOpen ? 'open' : ''}`}>
            <div className="notif-dropdown-header">Notifications</div>
            {notifications.map(n => (
              <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                {!n.read && <div className="notif-dot" />}
                <div>
                  <div className="notif-text">{n.message}</div>
                  <div className="notif-time">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="profile-btn" onClick={logout} title="Logout" id="logout-btn" aria-label="Logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
