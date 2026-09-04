'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClipboardCheck, Wallet, Receipt, Users, Lock, Unlock, ScaleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Totals {
  totalSales: number;
  cashExpenses: number; onlineExpenses: number; totalExpenses: number;
  cashSalaryPaid: number; onlineSalaryPaid: number; totalSalaryPaid: number;
  billCount: number; expenseCount: number; salaryPaymentCount: number;
  // Only present once the day is closed — typed in by the admin from the
  // ledger book, since the system can't know the real cash/online split
  // itself (payment happens after the bill prints, and some sales are never
  // billed at all).
  cashReceived?: number;
  onlineReceived?: number;
  netCashInDrawer?: number;
  netOnline?: number;
  netOverall?: number;
}

interface BillRow { _id: string; orderType: string; amount: number; createdAt: string; }
interface ExpenseRow { _id: string; description: string; category: string; paymentMethod: 'Cash' | 'Online'; amount: number; date: string; }
interface SalaryPaymentRow { _id: string; staffName: string; paymentMethod: 'Cash' | 'Online'; amount: number; paidAt: string; }

interface ClosingData {
  date: string;
  isClosed: boolean;
  totals: Totals;
  closing: { _id: string; notes: string | null; closedBy: string; closedAt: string } | null;
  bills: BillRow[];
  expenses: ExpenseRow[];
  salaryPayments: SalaryPaymentRow[];
}

interface HistoryRow {
  _id: string; date: string; notes: string | null; closedBy: string; closedAt: string;
  totalSales: number; totalExpenses: number; totalSalaryPaid: number;
  cashReceived: number; onlineReceived: number;
  netCashInDrawer: number; netOnline: number; netOverall: number;
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function DailyClosingPage() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<ClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [onlineReceivedInput, setOnlineReceivedInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/daily-closing?date=${date}`)
      .then((r) => r.json())
      .then((d: ClosingData) => {
        setData(d);
        setNotes(d.closing?.notes || '');
        setCashReceivedInput('');
        setOnlineReceivedInput('');
        setLoading(false);
      });
  }, [date]);

  const fetchHistory = () => {
    setHistoryLoading(true);
    fetch('/api/daily-closing/history?limit=30')
      .then((r) => r.json())
      .then((d) => { setHistory(d.closings || []); setHistoryLoading(false); });
  };

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchHistory(); }, []);

  const cashReceivedNum = parseFloat(cashReceivedInput);
  const onlineReceivedNum = parseFloat(onlineReceivedInput);
  const ledgerEntryValid = !Number.isNaN(cashReceivedNum) && cashReceivedNum >= 0 && !Number.isNaN(onlineReceivedNum) && onlineReceivedNum >= 0;

  const handleClose = async () => {
    if (!ledgerEntryValid) {
      toast.error("Enter today's Cash Received and Online Received from the ledger book first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/daily-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, notes, cashReceived: cashReceivedNum, onlineReceived: onlineReceivedNum }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`${format(new Date(date), 'dd/MM/yyyy')} closed`);
        fetchData();
        fetchHistory();
      } else {
        toast.error(result.error || 'Failed to close the day');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setBusy(false);
      setConfirmClose(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/daily-closing/${date}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${format(new Date(date), 'dd/MM/yyyy')} reopened`);
        fetchData();
        fetchHistory();
      } else {
        const result = await res.json();
        toast.error(result.error || 'Failed to reopen the day');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setBusy(false);
      setConfirmReopen(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const t = data.totals;
  // Preview net figures live as the admin types the ledger amounts in, before
  // actually closing the day — same math the server will apply.
  const previewNetCash = ledgerEntryValid ? cashReceivedNum - t.cashExpenses - t.cashSalaryPaid : null;
  const previewNetOnline = ledgerEntryValid ? onlineReceivedNum - t.onlineExpenses - t.onlineSalaryPaid : null;
  const previewNetOverall = ledgerEntryValid ? (cashReceivedNum + onlineReceivedNum) - t.totalExpenses - t.totalSalaryPaid : null;

  const netCash = data.isClosed ? t.netCashInDrawer ?? 0 : previewNetCash;
  const netOnline = data.isClosed ? t.netOnline ?? 0 : previewNetOnline;
  const netOverall = data.isClosed ? t.netOverall ?? 0 : previewNetOverall;
  // How far the ledger's actual received total is from what the system billed
  // — catches off-menu/unbilled sales or bills that haven't been paid for yet.
  const salesVariance = data.isClosed ? (t.cashReceived ?? 0) + (t.onlineReceived ?? 0) - t.totalSales : null;

  const breakdownRows = [
    { label: 'Expenses', icon: Wallet, cash: t.cashExpenses, online: t.onlineExpenses, total: t.totalExpenses, count: t.expenseCount },
    { label: 'Salary Paid', icon: Users, cash: t.cashSalaryPaid, online: t.onlineSalaryPaid, total: t.totalSalaryPaid, count: t.salaryPaymentCount },
  ];

  return (
    <div className="px-4 md:px-10 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-7 bg-amber-500 rounded-full" />
            Daily Closing
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review and close out each business day&apos;s sales, expenses, and salary payments.</p>
        </div>
        <input
          type="date"
          lang="en-IN"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
        />
      </div>

      {/* Status banner */}
      {data.isClosed ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 text-green-700 rounded-lg shrink-0"><Lock className="w-5 h-5" /></div>
            <div>
              <p className="font-bold text-green-800">
                Closed by {data.closing?.closedBy} on {data.closing && format(new Date(data.closing.closedAt), 'dd/MM/yyyy, hh:mm a')}
              </p>
              {data.closing?.notes && <p className="text-sm text-green-700 mt-1 italic">&quot;{data.closing.notes}&quot;</p>}
              <p className="text-xs text-green-600 mt-1">Bills, expenses, and salary payments for this date are locked.</p>
            </div>
          </div>
          {confirmReopen ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500">Reopen this day for edits?</span>
              <Button variant="outline" onClick={() => setConfirmReopen(false)} className="border-slate-200 text-slate-600 font-bold">Cancel</Button>
              <Button variant="destructive" onClick={handleReopen} disabled={busy} className="bg-red-600 text-white hover:bg-red-700 font-bold">
                {busy ? 'Reopening…' : 'Confirm Reopen'}
              </Button>
            </div>
          ) : (
            <button onClick={() => setConfirmReopen(true)} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-500 transition shrink-0">
              <Unlock className="w-4 h-4" />
              Reopen Day
            </button>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            <p className="font-bold text-amber-800">This day is still open</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-amber-800">Cash Received</label>
              <input
                type="number"
                min="0"
                value={cashReceivedInput}
                onChange={(e) => setCashReceivedInput(e.target.value)}
                placeholder="₹0"
                className="w-full mt-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-amber-800">Online Received</label>
              <input
                type="number"
                min="0"
                value={onlineReceivedInput}
                onChange={(e) => setOnlineReceivedInput(e.target.value)}
                placeholder="₹0"
                className="w-full mt-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <p className="text-xs text-amber-700">Copy today&apos;s actual cash and online totals from the ledger book — this is what the till/UPI actually received, not what the system billed.</p>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional closing notes (e.g. till counted, discrepancy noted)..."
            rows={2}
            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {confirmClose ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600">Close {format(new Date(date), 'dd/MM/yyyy')}? Its bills, expenses, and payments will be locked.</span>
              <Button variant="outline" onClick={() => setConfirmClose(false)} className="border-slate-200 text-slate-600 font-bold">Cancel</Button>
              <Button onClick={handleClose} disabled={busy || !ledgerEntryValid} className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                {busy ? 'Closing…' : 'Confirm Close'}
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClose(true)}
              disabled={!ledgerEntryValid}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              Close Day
            </button>
          )}
        </div>
      )}

      {/* Net summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border-2 border-amber-200 shadow-sm">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Net Cash in Drawer</p>
          <p className={`text-2xl font-black mt-1 ${netCash === null ? 'text-slate-300' : netCash < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {netCash === null ? '—' : `₹${netCash.toLocaleString('en-IN')}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Cash Received − Cash Expenses − Cash Salary Paid</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Net Online</p>
          <p className={`text-2xl font-black mt-1 ${netOnline === null ? 'text-slate-300' : 'text-slate-900'}`}>
            {netOnline === null ? '—' : `₹${netOnline.toLocaleString('en-IN')}`}
          </p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Overall</p>
          <p className={`text-2xl font-black mt-1 ${netOverall === null ? 'text-slate-300' : 'text-slate-900'}`}>
            {netOverall === null ? '—' : `₹${netOverall.toLocaleString('en-IN')}`}
          </p>
        </div>
      </div>
      {netCash === null && (
        <p className="text-xs text-slate-400 -mt-3">Enter Cash Received &amp; Online Received above to preview these figures.</p>
      )}

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Sales <span className="text-slate-300 normal-case">({t.billCount})</span>
            </p>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{t.totalSales.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">Total billed by the system (payment method not tracked per bill)</p>
        </div>
        {breakdownRows.map((row) => (
          <div key={row.label} className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <row.icon className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {row.label} <span className="text-slate-300 normal-case">({row.count})</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Cash</span><span className="font-semibold text-slate-800">₹{row.cash.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Online</span><span className="font-semibold text-slate-800">₹{row.online.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-slate-100 font-bold"><span className="text-slate-700">Total</span><span className="text-slate-900">₹{row.total.toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Ledger vs system reconciliation — only meaningful once closed */}
      {data.isClosed && (
        <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ScaleIcon className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ledger vs System</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between sm:block">
              <span className="text-slate-500">Ledger Cash Received</span>
              <span className="font-bold text-slate-900 sm:block sm:mt-0.5">₹{(t.cashReceived ?? 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-slate-500">Ledger Online Received</span>
              <span className="font-bold text-slate-900 sm:block sm:mt-0.5">₹{(t.onlineReceived ?? 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-slate-500">Variance vs Billed Sales</span>
              <span className={`font-bold sm:block sm:mt-0.5 ${salesVariance && Math.abs(salesVariance) > 0.01 ? 'text-amber-600' : 'text-slate-900'}`}>
                {salesVariance !== null ? `${salesVariance >= 0 ? '+' : ''}₹${salesVariance.toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Positive means more came in than was billed (e.g. small/off-menu sales that never got a bill). Negative means some billed amount hasn&apos;t been collected yet.</p>
        </div>
      )}

      {/* Breakdown lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden">
          <p className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Bills ({data.bills.length})</p>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {data.bills.map((b) => (
              <div key={b._id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <p className="text-slate-700">{format(new Date(b.createdAt), 'hh:mm a')} · {b.orderType}</p>
                <span className="font-bold text-slate-900">₹{b.amount.toFixed(2)}</span>
              </div>
            ))}
            {data.bills.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">No bills.</p>}
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden">
          <p className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Expenses ({data.expenses.length})</p>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {data.expenses.map((e) => (
              <div key={e._id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-700">{e.description}</p>
                  <span className={`text-[10px] font-bold uppercase ${e.paymentMethod === 'Online' ? 'text-blue-600' : 'text-green-600'}`}>{e.paymentMethod}</span>
                </div>
                <span className="font-bold text-slate-900">₹{e.amount.toFixed(2)}</span>
              </div>
            ))}
            {data.expenses.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">No expenses.</p>}
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden">
          <p className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Salary Payments ({data.salaryPayments.length})</p>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {data.salaryPayments.map((p) => (
              <div key={p._id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-700">{p.staffName}</p>
                  <span className={`text-[10px] font-bold uppercase ${p.paymentMethod === 'Online' ? 'text-blue-600' : 'text-green-600'}`}>{p.paymentMethod}</span>
                </div>
                <span className="font-bold text-slate-900">₹{p.amount.toFixed(2)}</span>
              </div>
            ))}
            {data.salaryPayments.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">No payments.</p>}
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Closing History</h2>
        <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Date</th>
                <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Sales (billed)</th>
                <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Expenses</th>
                <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Salary</th>
                <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Net Cash</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Closed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {historyLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No days closed yet.</td></tr>
              ) : (
                history.map((h) => (
                  <tr key={h._id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setDate(h.date)}>
                    <td className="px-4 py-3 font-medium text-slate-800">{format(new Date(h.date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-right text-slate-600">₹{h.totalSales.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-slate-600">₹{h.totalExpenses.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-slate-600">₹{h.totalSalaryPaid.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700">₹{h.netCashInDrawer.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">{h.closedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
