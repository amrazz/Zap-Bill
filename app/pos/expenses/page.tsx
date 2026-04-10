'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  department?: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Miscellaneous');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = () => {
    fetch('/api/expenses')
      .then(r => r.json())
      .then(data => {
        setExpenses(data);
        setLoading(false);
      });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const res = await fetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ description, amount: Number(amount), category, date: new Date(date) })
    });

    if (res.ok) {
      setDescription('');
      setAmount('');
      setIsAdding(false);
      fetchExpenses();
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
            Expenses Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all business outgoings.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Add New Expense
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddExpense} className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekly vegetable supply"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Amount (₹)</label>
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
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer appearance-none transition"
                >
                  <option value="Supplies">Supplies</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Rent">Rent</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
              Save Expense
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Date</th>
              <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Description</th>
              <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Category</th>
              <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {expenses.map((expense) => (
              <tr key={expense._id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 text-slate-600">{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{expense.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                    {expense.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">₹{expense.amount.toFixed(2)}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  No expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
