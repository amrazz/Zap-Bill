'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Users, CreditCard, Search, ChevronDown, ChevronUp, Wallet, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PaymentInstallment {
  amount: number;
  paidAt: string;
  notes?: string;
}

interface Salary {
  _id: string;
  staffName: string;
  month: string;
  year: number;
  totalAmount?: number;
  payments: PaymentInstallment[];
  status: 'partial' | 'paid';
  // Legacy fields
  amount?: number;
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ── Pay Remaining inline form ──────────────────────────────────────
function PayRemainingForm({ salary, onPaid }: { salary: Salary; onPaid: () => void }) {
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const totalPaid = salary.payments?.reduce((s, p) => s + p.amount, 0) ?? salary.amount ?? 0;
  const remaining = salary.totalAmount ? salary.totalAmount - totalPaid : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      toast.error('Please enter an amount');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/salaries/${salary._id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), paidAt, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Payment installment of ₹${Number(amount).toLocaleString()} recorded`);
        onPaid();
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-100 bg-amber-50/50 rounded-lg p-3 space-y-3">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Add Payment Installment</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (₹)</label>
          <input
            type="number"
            min="1"
            placeholder={remaining ? `Max ₹${remaining}` : '0.00'}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
          <input
            type="date"
            lang="en-IN"
            value={paidAt}
            onChange={e => setPaidAt(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
          />
        </div>
      </div>
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
      />
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50">
          {saving ? 'Saving…' : 'Confirm Payment'}
        </button>
      </div>
    </form>
  );
}

// ── Salary Card ────────────────────────────────────────────────────
function SalaryCard({ salary, onUpdate }: { salary: Salary; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);

  // Support both new (payments[]) and legacy records
  const hasPayments = salary.payments && salary.payments.length > 0;
  const totalPaid = hasPayments
    ? salary.payments.reduce((s, p) => s + p.amount, 0)
    : (salary.amount ?? 0);

  const isPartial = salary.status === 'partial' || (!hasPayments && false);
  const remaining = salary.totalAmount ? salary.totalAmount - totalPaid : undefined;
  const progressPct = salary.totalAmount ? Math.min(100, (totalPaid / salary.totalAmount) * 100) : 100;

  return (
    <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm hover:shadow-md transition">
      {/* Top row */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPartial ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600'}`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{salary.staffName}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{salary.month} {salary.year}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-slate-900">₹{totalPaid.toLocaleString('en-IN')}</p>
          {salary.totalAmount && (
            <p className="text-[10px] text-slate-400">of ₹{salary.totalAmount.toLocaleString('en-IN')}</p>
          )}
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isPartial ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
            {isPartial ? 'Partial' : 'Paid'}
          </span>
        </div>
      </div>

      {/* Progress bar (only if totalAmount set) */}
      {salary.totalAmount && (
        <div className="mt-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isPartial ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {isPartial && remaining && (
            <p className="text-[10px] text-slate-400 mt-1 text-right">₹{remaining.toLocaleString('en-IN')} remaining</p>
          )}
        </div>
      )}

      {/* Payment history toggle */}
      {hasPayments && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wide transition"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {salary.payments.length} payment{salary.payments.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {salary.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-md px-3 py-2">
                  <span className="text-slate-500">{format(new Date(p.paidAt), 'dd/MM/yyyy')}{p.notes ? ` · ${p.notes}` : ''}</span>
                  <span className="font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legacy record note */}
      {!hasPayments && salary.notes && (
        <div className="mt-3 pt-3 border-t border-slate-50">
          <p className="text-xs text-slate-500 italic">"{salary.notes}"</p>
        </div>
      )}
      {!hasPayments && salary.paidAt && (
        <p className="text-[10px] text-slate-400 mt-2">Paid: {format(new Date(salary.paidAt), 'dd/MM/yyyy')}</p>
      )}

      {/* Pay Remaining button */}
      {isPartial && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowPayForm(v => !v)}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {showPayForm ? 'Cancel' : 'Pay Remaining'}
          </button>
          {showPayForm && (
            <PayRemainingForm salary={salary} onPaid={() => { setShowPayForm(false); onUpdate(); }} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Form state
  const [staffName, setStaffName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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
        toast.success(`Salary recorded for ${staffName}`);
        setStaffName(''); setTotalAmount(''); setPaidAmount(''); setNotes('');
        setIsAdding(false);
        fetchSalaries();
      } else {
        toast.error(data.error || 'Failed to record salary');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    }
  };

  const filtered = useMemo(() => {
    return salaries.filter(s => {
      // Name search
      const matchSearch = !search || s.staffName.toLowerCase().includes(search.toLowerCase());

      // Status filter
      const matchStatus = filterStatus === 'All' || s.status === filterStatus || (!s.status && filterStatus === 'paid');

      // Date Range filter
      // Check if the overall record date or any installment date falls in range
      const recordDate = new Date(s.paidAt || s.createdAt || Date.now());
      const instDates = (s.payments || []).map(p => new Date(p.paidAt));
      const allDates = [recordDate, ...instDates];

      const matchRange = (!filterFrom || allDates.some(d => d >= new Date(filterFrom))) &&
        (!filterTo || allDates.some(d => d <= new Date(filterTo + 'T23:59:59')));

      return matchSearch && matchStatus && matchRange;
    });
  }, [salaries, search, filterStatus, filterFrom, filterTo]);

  // Stats
  const stats = useMemo(() => {
    const totalPaid = salaries.reduce((sum, s) => {
      const p = (s.payments || []).reduce((acc, curr) => acc + curr.amount, 0);
      return sum + (p || s.amount || 0);
    }, 0);

    const pendingCount = salaries.filter(s => s.status === 'partial').length;
    
    // Last 30 days total
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPaid = salaries.reduce((sum, s) => {
      const pTotal = (s.payments || []).filter(p => new Date(p.paidAt) >= thirtyDaysAgo).reduce((acc, curr) => acc + curr.amount, 0);
      return sum + pTotal;
    }, 0);

    return { totalPaid, pendingCount, recentPaid };
  }, [salaries]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[100vw] mx-4 md:mx-10 p-4 py-8 space-y-6">
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
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Distributed</p>
            <p className="text-xl font-black text-slate-900">₹{stats.totalPaid.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Clearances</p>
            <p className="text-xl font-black text-slate-900">{stats.pendingCount} <span className="text-xs font-normal text-slate-400 uppercase">Records</span></p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
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
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">New Salary Record</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Staff Name</label>
              <input
                type="text"
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                placeholder="Full Name"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
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
                placeholder="e.g. 5000"
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
      <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[280px] relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by staff name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1 rounded-lg">
          <input
            type="date"
            lang="en-IN"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">to</span>
          <input
            type="date"
            lang="en-IN"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 cursor-pointer"
          />
        </div>

        <div className="relative">
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)} 
            className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 cursor-pointer appearance-none transition"
          >
            <option value="All">All Payments</option>
            <option value="partial">Partial / Pending</option>
            <option value="paid">Fully Paid</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {(search || filterFrom || filterTo || filterStatus !== 'All') && (
          <button 
            onClick={() => { setSearch(''); setFilterFrom(''); setFilterTo(''); setFilterStatus('All'); }} 
            className="text-xs font-bold text-slate-400 hover:text-amber-600 transition p-2 rounded-lg hover:bg-amber-50"
          >
            Reset
          </button>
        )}
        
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
           <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filtered.length} Results</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(salary => (
          <SalaryCard key={salary._id} salary={salary} onUpdate={fetchSalaries} />
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 py-12 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
            <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="font-medium">{salaries.length === 0 ? 'No salary records found.' : 'No results match your filters.'}</p>
            <p className="text-xs">Staff payments will appear here once recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
