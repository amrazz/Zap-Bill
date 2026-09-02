'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Users, CreditCard, Search, Wallet, Clock, TrendingUp, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PaymentInstallment {
  _id: string;
  amount: number;
  paidAt: string;
  notes?: string;
}

interface Salary {
  _id: string;
  staffName: string;
  totalAmount?: number;
  payments: PaymentInstallment[];
  status: 'partial' | 'paid';
  createdAt: string;
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

// ── Staff detail modal: full history, add payment, delete ──────────
function StaffDetailModal({ salary, onUpdate, onDeleted, onClose }: {
  salary: Salary;
  onUpdate: (s: Salary) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState(false);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<string | null>(null);

  const totalPaid = salary.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = salary.totalAmount != null ? salary.totalAmount - totalPaid : undefined;
  const progressPct = salary.totalAmount ? Math.min(100, (totalPaid / salary.totalAmount) * 100) : 100;
  const sortedPayments = [...salary.payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      toast.error('Please enter an amount');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffName: salary.staffName, paidAmount: Number(amount), paidAt, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Payment of ₹${Number(amount).toLocaleString()} recorded for ${salary.staffName}`);
        setAmount(''); setNotes(''); setPaidAt(todayStr());
        onUpdate(data);
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/salaries/${salary._id}/payments/${paymentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Payment removed');
        onUpdate({ ...data, payments: data.payments });
      } else {
        toast.error(data.error || 'Failed to delete payment');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setConfirmDeletePayment(null);
    }
  };

  const handleDeleteStaff = async () => {
    try {
      const res = await fetch(`/api/salaries/${salary._id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Deleted all salary records for ${salary.staffName}`);
        onDeleted();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white border-slate-200 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            {salary.staffName}
          </DialogTitle>
          <DialogDescription className="text-slate-500">Payment history and balance for this staff member.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Paid</p>
            <p className="text-lg font-black text-slate-900">₹{totalPaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agreed Total</p>
            <p className="text-lg font-black text-slate-900">{salary.totalAmount != null ? `₹${salary.totalAmount.toLocaleString('en-IN')}` : '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Remaining</p>
            <p className={`text-lg font-black ${remaining && remaining > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
              {remaining != null ? `₹${remaining.toLocaleString('en-IN')}` : '—'}
            </p>
          </div>
        </div>

        {salary.totalAmount != null && (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden -mt-1 mb-1">
            <div
              className={`h-full rounded-full transition-all ${salary.status === 'partial' ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Add payment */}
        <form onSubmit={handleAddPayment} className="bg-amber-50/60 border border-amber-100 rounded-lg p-3 space-y-2">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Add Payment</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" min="1" placeholder="Amount (₹)" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
            <input
              type="date" lang="en-IN" value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
          <input
            type="text" placeholder="Notes (optional)" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>

        {/* History */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
            Payment History ({sortedPayments.length})
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {sortedPayments.map((p) => (
              <div key={p._id} className="flex items-center justify-between text-xs bg-slate-50 rounded-md px-3 py-2 group">
                <div>
                  <span className="font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 ml-2">{format(new Date(p.paidAt), 'dd/MM/yyyy')}</span>
                  {p.notes && <span className="text-slate-400 italic ml-2">· {p.notes}</span>}
                </div>
                {confirmDeletePayment === p._id ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleDeletePayment(p._id)} className="text-red-600 font-bold hover:underline">Confirm</button>
                    <button onClick={() => setConfirmDeletePayment(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeletePayment(p._id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    title="Delete this payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {sortedPayments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No payments recorded.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4">
          {confirmDeleteStaff ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 mr-auto sm:mr-2">Delete all records for {salary.staffName}?</span>
              <Button variant="outline" type="button" onClick={() => setConfirmDeleteStaff(false)} className="border-slate-200 text-slate-600 font-bold">
                Cancel
              </Button>
              <Button variant="destructive" type="button" onClick={handleDeleteStaff} className="bg-red-600 text-white hover:bg-red-700 font-bold">
                Confirm Delete
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteStaff(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-500 transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete Staff Record
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Form state
  const [staffName, setStaffName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchSalaries(); }, []);

  const fetchSalaries = () => {
    fetch('/api/salaries')
      .then(r => r.json())
      .then(data => { setSalaries(data); setLoading(false); });
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !paidAmount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName,
          totalAmount: totalAmount ? Number(totalAmount) : undefined,
          paidAmount: Number(paidAmount),
          paidAt: paymentDate,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Payment recorded for ${staffName}`);
        setStaffName(''); setTotalAmount(''); setPaidAmount(''); setNotes(''); setPaymentDate(todayStr());
        setIsAdding(false);
        fetchSalaries();
      } else {
        toast.error(data.error || 'Failed to record salary');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    }
  };

  const filtered = useMemo(() => {
    return salaries.filter(s => {
      const matchSearch = !search || s.staffName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'All' || s.status === filterStatus;

      const allDates = [new Date(s.createdAt), ...s.payments.map(p => new Date(p.paidAt))];
      const matchRange = (!filterFrom || allDates.some(d => d >= new Date(filterFrom))) &&
        (!filterTo || allDates.some(d => d <= new Date(filterTo + 'T23:59:59')));

      return matchSearch && matchStatus && matchRange;
    });
  }, [salaries, search, filterStatus, filterFrom, filterTo]);

  // Stats
  const stats = useMemo(() => {
    const totalPaid = salaries.reduce((sum, s) => sum + s.payments.reduce((acc, p) => acc + p.amount, 0), 0);
    const pendingCount = salaries.filter(s => s.status === 'partial').length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPaid = salaries.reduce((sum, s) => {
      const pTotal = s.payments.filter(p => new Date(p.paidAt) >= thirtyDaysAgo).reduce((acc, p) => acc + p.amount, 0);
      return sum + pTotal;
    }, 0);

    return { totalPaid, pendingCount, recentPaid };
  }, [salaries]);

  const selectedSalary = salaries.find(s => s._id === selectedId) || null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-7 bg-amber-500 rounded-full" />
            Staff Salaries
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage monthly payroll and staff payments.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Distributed</p>
            <p className="text-xl font-black text-slate-900">₹{stats.totalPaid.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Clearances</p>
            <p className="text-xl font-black text-slate-900">{stats.pendingCount} <span className="text-xs font-normal text-slate-400 uppercase">Staff</span></p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-500 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 30 Days</p>
            <p className="text-xl font-black text-slate-900">₹{stats.recentPaid.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Add Salary Form */}
      {isAdding && (
        <form onSubmit={handleAddSalary} className="bg-white border border-amber-100 rounded-lg p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">New Payment</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Staff Name</label>
              <input
                type="text"
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                placeholder="Full Name"
                list="staff-names"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
              <datalist id="staff-names">
                {salaries.map(s => <option key={s._id} value={s.staffName} />)}
              </datalist>
              <p className="text-[10px] text-slate-400 ml-1">An existing name adds to that person&apos;s history instead of creating a new one.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Total Salary (₹) <span className="text-slate-400 font-normal normal-case">(optional — for tracking balance)</span>
              </label>
              <input
                type="number"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                placeholder="e.g. 10000"
                min="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Amount Paid Now (₹)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                placeholder="e.g. 500"
                min="0"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Date</label>
              <input
                type="date"
                lang="en-IN"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Advance payment, bonus included..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition shadow-md shadow-amber-500/20">
              Confirm Payment
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="flex-1 min-w-0 relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by staff name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 sm:flex-initial flex items-center gap-2 bg-slate-50 border border-slate-100 p-1 rounded-lg">
            <input
              type="date"
              lang="en-IN"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 cursor-pointer w-[110px]"
            />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">to</span>
            <input
              type="date"
              lang="en-IN"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 cursor-pointer w-[110px]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 cursor-pointer appearance-none transition"
          >
            <option value="All">All Payments</option>
            <option value="partial">Partial / Pending</option>
            <option value="paid">Fully Paid</option>
          </select>

          {(search || filterFrom || filterTo || filterStatus !== 'All') && (
            <button
              onClick={() => { setSearch(''); setFilterFrom(''); setFilterTo(''); setFilterStatus('All'); }}
              className="text-xs font-bold text-slate-400 hover:text-amber-600 transition p-2 rounded-lg hover:bg-amber-50"
            >
              Reset
            </button>
          )}
        </div>

        <div className="lg:ml-auto flex items-center justify-between lg:justify-end gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{filtered.length} Staff</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Staff</th>
              <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Total Paid</th>
              <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Agreed Total</th>
              <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Remaining</th>
              <th className="text-center px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
              <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Last Paid</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((salary) => {
              const totalPaid = salary.payments.reduce((s, p) => s + p.amount, 0);
              const remaining = salary.totalAmount != null ? salary.totalAmount - totalPaid : undefined;
              const lastPayment = [...salary.payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];
              return (
                <tr key={salary._id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <button onClick={() => setSelectedId(salary._id)} className="flex items-center gap-2.5 font-bold text-slate-800 hover:text-amber-600 transition">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      {salary.staffName}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{totalPaid.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{salary.totalAmount != null ? `₹${salary.totalAmount.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{remaining != null ? `₹${remaining.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${salary.status === 'partial' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                      {salary.status === 'partial' ? 'Partial' : 'Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">{lastPayment ? format(new Date(lastPayment.paidAt), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedId(salary._id)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">{salaries.length === 0 ? 'No salary records found.' : 'No results match your filters.'}</p>
                  <p className="text-xs">Staff payments will appear here once recorded.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSalary && (
        <StaffDetailModal
          salary={selectedSalary}
          onUpdate={(updated) => {
            setSalaries((prev) => prev.map((s) => s._id === updated._id ? { ...s, ...updated } : s));
          }}
          onDeleted={() => {
            setSalaries((prev) => prev.filter((s) => s._id !== selectedSalary._id));
            setSelectedId(null);
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
