import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-slate-50 text-4xl shadow-surface ring-1 ring-slate-100">
        🔍
      </div>
      <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
        Page Not Found
      </h2>
      <p className="mb-8 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or head back to the dashboard.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-[#D11439] to-[#f02852] px-5 py-2.5 text-sm font-bold text-white shadow-primary transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-primary-hover active:translate-y-0 active:scale-[0.99]"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
