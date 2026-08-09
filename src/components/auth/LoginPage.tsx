'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { loginAction } from '@/app/actions/auth';

export default function LoginPage({ branchSlug }: { branchSlug?: string }) {
  const { login, branches, refetchData } = useApp();
  
  const branch = branchSlug ? branches.find((b: any) => b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === branchSlug) : null;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const res = await loginAction(email, password, branchSlug);
      if (res.success && res.data) {
        login(res.data);
        await refetchData(res.data);
        if (res.data.role === 'investor' && branchSlug) {
          window.location.href = `/${branchSlug}/group`;
        }
      } else {
        setError(res.error || 'Authentication failed. Please try again.');
      }
    } catch (e: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-[1] flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-50 bg-[radial-gradient(circle_at_2px_2px,rgba(209,20,57,0.1)_1.5px,transparent_0)] bg-[length:48px_48px] px-4 py-8 font-sans sm:px-6">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="size-full stroke-[rgba(209,20,57,0.2)] stroke-[1.5]"
        >
          <path d="M-100,200 Q250,100 500,200 T1100,200" fill="none" vectorEffect="non-scaling-stroke" />
          <path d="M-100,500 Q250,400 500,500 T1100,500" fill="none" vectorEffect="non-scaling-stroke" />
          <path d="M-100,800 Q250,700 500,800 T1100,800" fill="none" vectorEffect="non-scaling-stroke" />
          <circle cx="250" cy="150" r="3" fill="rgba(209, 20, 57, 0.3)" />
          <circle cx="750" cy="450" r="3" fill="rgba(209, 20, 57, 0.3)" />
          <circle cx="500" cy="750" r="3" fill="rgba(209, 20, 57, 0.3)" />
        </svg>
      </div>

      <div className="relative z-[1] w-full max-w-[440px] animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-surface transition-[transform,box-shadow] duration-500 motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-surface-hover">
        <div className="bg-gradient-to-b from-accent/5 to-white px-8 pb-6 pt-10 text-center sm:px-12 sm:pt-12">
          <div className="relative mx-auto mb-6 flex size-16 items-center justify-center rounded-[20px] border border-accent/15 bg-white transition duration-300 [box-shadow:0_0_0_1px_rgba(209,20,57,0.08)]">
            <img src="/logo.png" alt="AIBAK Logo" className="size-11 object-contain" />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            {branch ? branch.name : 'Welcome Back'}
          </h2>
          <p className="text-[15px] font-medium text-slate-500">
            {branch ? `${branch.location} Portal` : 'Sign in to the AIBAK terminal'}
          </p>
        </div>

        <form className="space-y-6 px-6 pb-10 sm:px-12 sm:pb-12" onSubmit={handleSubmit}>
          <div className="group space-y-2.5">
            <label htmlFor="login-email" className="block text-sm font-semibold text-slate-600 transition group-focus-within:translate-x-1 group-focus-within:text-accent">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="admin@aibak.capital"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-[18px] border border-black/[0.06] bg-slate-50 px-5 py-4 text-[15px] font-medium text-slate-900 outline-none transition focus:scale-[1.02] focus:border-accent focus:bg-white focus:shadow-[0_0_0_5px_rgba(209,20,57,0.06)]"
            />
          </div>

          <div className="group space-y-2.5">
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-600 transition group-focus-within:translate-x-1 group-focus-within:text-accent">
              Security Key
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={`w-full rounded-[18px] border bg-slate-50 px-5 py-4 text-[15px] font-medium text-slate-900 outline-none transition focus:scale-[1.02] focus:bg-white focus:shadow-[0_0_0_5px_rgba(209,20,57,0.06)] ${error ? 'border-red-400 focus:border-red-500' : 'border-black/[0.06] focus:border-accent'
                }`}
            />
            {error && <p className="text-[13px] font-semibold text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            id="login-submit"
            className="flex w-full items-center justify-center gap-2.5 rounded-[18px] bg-slate-950 py-4 text-base font-bold text-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition hover:-translate-y-1 hover:bg-accent hover:shadow-[0_15px_30px_rgba(209,20,57,0.2)] active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <span className="flex gap-1" aria-hidden>
                <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-current" />
                <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-current" />
                <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-current" />
              </span>
            ) : (
              <>
                <span>Login</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          <div className="border-t border-black/[0.06] pt-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Encryption Active • v2.0.26</p>
          </div>
        </form>
      </div>
    </div>
  );
}
