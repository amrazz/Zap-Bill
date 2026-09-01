'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud, UploadCloud, HardDrive, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function BackupPage() {
  const [hasElectron, setHasElectron] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mongoUri, setMongoUri] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    // Feature-detect the Electron preload bridge on mount — window.electronAPI
    // never exists during SSR, so this can't be computed at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  const handleBackup = async () => {
    if (!window.electronAPI) return;
    setBusy(true);
    const result = await window.electronAPI.saveBackup();
    setBusy(false);
    if (result.success) {
      toast.success(`Backup saved${result.path ? ` to ${result.path}` : ''}`);
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleRestore = async () => {
    if (!window.electronAPI) return;
    if (!confirm('Restoring a backup replaces all current data in this app and restarts it. Continue?')) return;
    setBusy(true);
    const result = await window.electronAPI.restoreBackup();
    setBusy(false);
    if (result.success) {
      toast.success('Backup restored. Restarting…');
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleImport = async () => {
    if (!mongoUri.trim()) {
      toast.error('Paste your MongoDB connection string first.');
      return;
    }
    if (!confirm('This adds data from the old MongoDB database into this app. Items already imported before are skipped automatically. Continue?')) return;

    setImporting(true);
    try {
      // A large import can legitimately take a while, but this must never hang
      // forever if the connection stalls — cap it so the button can't get stuck.
      const res = await fetch('/api/setup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: mongoUri.trim() }),
        signal: AbortSignal.timeout(5 * 60 * 1000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.success('Import complete.');
        setMongoUri('');
      } else {
        toast.error(data?.error || 'Import failed.');
      }
    } catch {
      toast.error('The import is taking unusually long or the connection stalled. It may have completed anyway — check your dish/bill lists before retrying.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="px-4 md:px-10 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-7 bg-amber-500 rounded-full" />
          Backup &amp; Restore
        </h1>
        <p className="text-sm text-slate-500 mt-1">All your data lives in a single local file on this computer. Back it up regularly.</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg p-6 shadow-sm space-y-4">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg w-fit">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800">Import from MongoDB</h2>
          <p className="text-sm text-slate-500 mt-1">Paste the old online database&apos;s connection string to pull its dishes, categories, bills, expenses and salaries into this app. Safe to run again later &mdash; only new/missing items are added.</p>
        </div>
        <input
          type="text"
          value={mongoUri}
          onChange={(e) => setMongoUri(e.target.value)}
          placeholder="mongodb+srv://user:password@cluster.mongodb.net/"
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition"
        >
          {importing ? 'Importing…' : 'Import Data'}
        </button>
      </div>

      {!hasElectron && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          Backup and restore are only available in the installed desktop app.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-lg p-6 shadow-sm space-y-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg w-fit">
            <DownloadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Save a Backup</h2>
            <p className="text-sm text-slate-500 mt-1">Copies today&apos;s data to a file you choose &mdash; keep it somewhere safe (a USB drive, cloud folder, etc.).</p>
          </div>
          <button
            onClick={handleBackup}
            disabled={!hasElectron || busy}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition"
          >
            {busy ? 'Working…' : 'Save Backup'}
          </button>
        </div>

        <div className="bg-white border border-slate-100 rounded-lg p-6 shadow-sm space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-fit">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Restore a Backup</h2>
            <p className="text-sm text-slate-500 mt-1">Replaces all current data with a previously saved backup file. The app will restart.</p>
          </div>
          <button
            onClick={handleRestore}
            disabled={!hasElectron || busy}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition"
          >
            {busy ? 'Working…' : 'Restore Backup'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
        <HardDrive className="w-4 h-4 shrink-0" />
        Data is stored locally on this PC only. Take regular backups so you don&apos;t lose anything if this computer is lost or damaged.
      </div>
    </div>
  );
}
