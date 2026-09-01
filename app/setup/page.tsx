'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<'admin' | 'import'>('admin');
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [mongoUri, setMongoUri] = useState('');

  function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setStep('import');
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Setup failed. Please try again.');
      }
    });
  }

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setImportMessage('');

    startTransition(async () => {
      try {
        // A large import (many dish images, thousands of bills) can legitimately
        // take a while, but this must never hang forever if the connection stalls.
        const res = await fetch('/api/setup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri: mongoUri }),
          signal: AbortSignal.timeout(5 * 60 * 1000),
        });

        const data = await res.json().catch(() => null);
        if (res.ok) {
          const r = data?.result;
          setImportMessage(
            r ? `Imported ${r.dishes} dishes, ${r.categories} categories, ${r.bills} bills, ${r.expenses} expenses, ${r.salaries} salary records.` : 'Import complete.'
          );
        } else {
          setError(data?.error ?? 'Import failed. Check the connection string and try again.');
        }
      } catch {
        setError('The import is taking unusually long or the connection stalled. It may have still completed in the background — click "Continue to App" and check whether your data is there before retrying.');
      }
    });
  }

  function finish() {
    router.push('/checkout');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-amber-500 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Zapbill Setup</h1>
          <p className="text-slate-500 text-sm mt-1">{step === 'admin' ? 'Create your admin account' : 'Bring in your existing data (optional)'}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-8">
          {step === 'admin' ? (
            <form onSubmit={handleCreateAdmin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Username</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  placeholder="e.g. admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  placeholder="Re-enter password"
                />
              </div>

              {error && <div className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {isPending ? 'Creating…' : 'Create Admin Account'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <form onSubmit={handleImport} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">MongoDB Connection String</label>
                  <input
                    type="text"
                    value={mongoUri}
                    onChange={(e) => setMongoUri(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    placeholder="mongodb+srv://... or mongodb://..."
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Only your dishes, categories, bills, expenses and salaries are imported. Leave blank and skip if you want to start fresh.</p>
                </div>

                {error && <div className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
                {importMessage && <div className="text-green-700 bg-green-50 rounded-lg px-3 py-2 text-sm">{importMessage}</div>}

                <button
                  type="submit"
                  disabled={isPending || !mongoUri}
                  className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition disabled:opacity-60"
                >
                  {isPending ? 'Importing…' : 'Import Data'}
                </button>
              </form>

              <button
                onClick={finish}
                className="w-full py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
              >
                {importMessage ? 'Continue to App' : 'Skip — Start Fresh'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
