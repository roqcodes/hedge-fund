'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }
    if (password.length < 4) { setError('Invalid credentials. Please try again.'); return; }

    setLoading(true);

    setTimeout(() => {
      login(email, 'admin', '');
      setLoading(false);
    }, 1200); // Slightly longer for a more "premium" feel with the loader
  };

  return (
    <div className="auth-page" style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(209, 20, 57, 0.15) 1.5px, transparent 0)',
      backgroundSize: '50px 50px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="bg-graphic" style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{
          width: '100%',
          height: '100%',
          stroke: 'rgba(209, 20, 57, 0.2)',
          strokeWidth: '1.5'
        }}>
          <path d="M-100,200 Q250,100 500,200 T1100,200" fill="none" vectorEffect="non-scaling-stroke" />
          <path d="M-100,500 Q250,400 500,500 T1100,500" fill="none" vectorEffect="non-scaling-stroke" />
          <path d="M-100,800 Q250,700 500,800 T1100,800" fill="none" vectorEffect="non-scaling-stroke" />
          <circle cx="250" cy="150" r="3" fill="rgba(209, 20, 57, 0.3)" />
          <circle cx="750" cy="450" r="3" fill="rgba(209, 20, 57, 0.3)" />
          <circle cx="500" cy="750" r="3" fill="rgba(209, 20, 57, 0.3)" />
        </svg>
      </div>

      <div className="auth-card animate-in">
        <div className="auth-header">
          <div className="auth-logo">
            <span>H</span>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to the HEDGE terminal</p>
        </div>

        <form className="auth-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Terminal ID / Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@hedge.capital"
              value={email}
              onChange={e => setEmail(e.target.value)}
              id="login-email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Security Key</label>
            <input
              className={`form-input ${error ? 'error' : ''}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              id="login-password"
              required
            />
            {error && <div className="form-error">{error}</div>}
          </div>

          <button className="btn-primary" type="submit" disabled={loading} id="login-submit">
            {loading ? (
              <div className="loader-dots">
                <span></span><span></span><span></span>
              </div>
            ) : (
              <>
                <span>Login</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          <div className="auth-footer">
            <p>Encryption Active • v2.0.26</p>
          </div>
        </form>
      </div>
    </div>
  );
}
