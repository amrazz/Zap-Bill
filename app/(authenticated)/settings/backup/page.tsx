'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud, UploadCloud, HardDrive, Database, Printer, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_LABELS: Record<number, string> = { 58: '2"', 76: '3"', 80: '3 1/8"', 112: '4"' };
const PRESET_WIDTHS = Object.keys(PRESET_LABELS).map(Number);

function buildTestReceiptHtml(widthMm: number) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: ${widthMm}mm auto; margin: 4mm 3mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.35; width: 100%; color: #000; background: #fff; }
    .center { text-align: center; }
    .dash { border-top: 1.5px dashed #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { text-align: left; font-size: 11px; font-weight: normal; text-transform: uppercase; border-bottom: 1.5px dashed #000; padding-bottom: 5px; }
    td { padding: 3px 0; }
  </style></head><body>
    <div class="center" style="font-size:16px;font-weight:bold;">TEST PRINT</div>
    <div class="center" style="font-size:12px;margin-top:4px;">Paper width: ${widthMm}mm</div>
    <div class="dash"></div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>
        <tr><td>Sample Dish</td><td style="text-align:center;">2</td><td style="text-align:right;">₹100</td><td style="text-align:right;">₹200</td></tr>
      </tbody>
    </table>
    <div class="dash"></div>
    <div class="center" style="font-size:11px;">${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
    <div class="center" style="font-size:10px;margin-top:6px;">If all four columns (Item, Qty, Rate, Amount) are visible and the receipt isn't cut off, this width is correct.</div>
  </body></html>`;
}

export default function BackupPage() {
  const [hasElectron, setHasElectron] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mongoUri, setMongoUri] = useState('');
  const [importing, setImporting] = useState(false);
  const [printerWidthMm, setPrinterWidthMm] = useState(80);
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Feature-detect the Electron preload bridge on mount — window.electronAPI
    // never exists during SSR, so this can't be computed at render time.
    setHasElectron(typeof window !== 'undefined' && !!window.electronAPI);

    fetch('/api/settings/printer')
      .then((r) => r.json())
      .then((d) => { if (d.printerWidthMm) setPrinterWidthMm(d.printerWidthMm); })
      .catch(() => { });

    window.electronAPI?.getAppVersion?.().then(setAppVersion).catch(() => { });
  }, []);

  const handleSavePrinterWidth = async () => {
    setSavingPrinter(true);
    try {
      const res = await fetch('/api/settings/printer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerWidthMm }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Printer width saved: ${data.printerWidthMm}mm`);
      } else {
        toast.error(data.error || 'Failed to save printer width');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleTestPrint = async () => {
    if (!window.electronAPI?.printReceipt) return;
    setTestPrinting(true);
    try {
      const result = await window.electronAPI.printReceipt(buildTestReceiptHtml(printerWidthMm), printerWidthMm);
      if (result.success) {
        toast.success('Test receipt sent — check the printout.');
      } else {
        toast.error(result.error || "Couldn't print — check that a printer is connected and set as default.");
      }
    } finally {
      setTestPrinting(false);
    }
  };

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
        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg w-fit">
          <Printer className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800">Receipt Printer Width</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={PRESET_WIDTHS.includes(printerWidthMm) ? printerWidthMm : 'custom'}
              onChange={(e) => { if (e.target.value !== 'custom') setPrinterWidthMm(Number(e.target.value)); }}
              className="pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer appearance-none transition"
            >
              {PRESET_WIDTHS.map((mm) => (
                <option key={mm} value={mm}>{mm}mm ({PRESET_LABELS[mm]})</option>
              ))}
              <option value="custom">Custom</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="40"
              max="300"
              value={printerWidthMm}
              onChange={(e) => setPrinterWidthMm(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="text-sm text-slate-400">mm (custom)</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSavePrinterWidth}
            disabled={savingPrinter}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition"
          >
            {savingPrinter ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleTestPrint}
            disabled={!hasElectron || testPrinting}
            className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition"
          >
            {testPrinting ? 'Printing…' : 'Test Print'}
          </button>
        </div>
        {!hasElectron && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Test Print is only available in the installed desktop app.</p>
        )}
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

      {appVersion && (
        <p className="text-center text-xs text-slate-300">Zapbill v{appVersion}</p>
      )}
    </div>
  );
}
