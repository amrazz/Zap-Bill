'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Calendar as CalendarIcon, Wallet, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface Salary {
  _id: string;
  staffName: string;
  amount: number;
  month: string;
  year: number;
  paidAt: string;
  notes?: string;
}

export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [staffName, setStaffName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = () => {
    fetch('/api/salaries')
      .then(r => r.json())
      .then(data => {
        setSalaries(data);
        setLoading(false);
      });
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !amount) return;

    const payDate = new Date(paymentDate);
    const res = await fetch('/api/salaries', {
      method: 'POST',
      body: JSON.stringify({ 
        staffName, 
        amount: Number(amount), 
        month: format(payDate, 'MMMM'), 
        year: payDate.getFullYear(), 
        paidAt: payDate,
        notes 
      })
    });

    if (res.ok) {
      setStaffName('');
      setAmount('');
      setNotes('');
      setIsAdding(false);
      fetchSalaries();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[100vw] mx-4 md:mx-10 p-4 py-8 space-y-6">
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

      {isAdding && (
        <form onSubmit={handleAddSalary} className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Staff Name</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Paid Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Date (Day/Month/Year)</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition shadow-md shadow-amber-500/20"
            >
              Confirm Salary Payment
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {salaries.map((salary) => (
          <div key={salary._id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{salary.staffName}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{salary.month} {salary.year}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">₹{salary.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Paid: {format(new Date(salary.paidAt), 'PPPP')}</p>
              </div>
            </div>
            {salary.notes && (
              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-500 italic">"{salary.notes}"</p>
              </div>
            )}
          </div>
        ))}
        {salaries.length === 0 && (
          <div className="md:col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No salary records found.</p>
            <p className="text-xs">Staff payments will appear here once recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
