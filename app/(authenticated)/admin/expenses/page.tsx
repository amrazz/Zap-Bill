'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, Wallet, TrendingUp, Filter, ChevronDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  department?: string;
}

const CATEGORIES = ['All', 'Supplies', 'Electricity', 'Rent', 'Maintenance', 'Miscellaneous'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Miscellaneous');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = () => {
    fetch('/api/expenses')
      .then(r => r.json())
      .then(data => { setExpenses(data); setLoading(false); });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: Number(amount),
          category,
          date: new Date(date)
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Expense "${description}" recorded`);
        setDescription(''); setAmount(''); setIsAdding(false);
        fetchExpenses();
      } else {
        toast.error(data.error || 'Failed to record expense');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === 'All' || e.category === filterCategory;
      const eDate = new Date(e.date);
      const matchFrom = !filterFrom || eDate >= new Date(filterFrom);
      const matchTo = !filterTo || eDate <= new Date(filterTo + 'T23:59:59');
      return matchSearch && matchCat && matchFrom && matchTo;
    });
  }, [expenses, search, filterCategory, filterFrom, filterTo]);

  // Stats
  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);

    // This month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTotal = expenses
      .filter(e => new Date(e.date) >= startOfMonth)
      .reduce((s, e) => s + e.amount, 0);

    // Category breakdown for "Highest Category"
    const catTotals: Record<string, number> = {};
    expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    let highestCat = 'N/A';
    let maxVal = -1;
    Object.entries(catTotals).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        highestCat = cat;
      }
    });

    return { total, monthlyTotal, highestCat };
  }, [expenses]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

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
            Expenses Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all business expenses.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Add New Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expenses</p>
            <p className="text-xl font-black text-slate-900">₹{stats.total.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spent This Month</p>
            <p className="text-xl font-black text-slate-900">₹{stats.monthlyTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Highest Category</p>
            <p className="text-xl font-black text-slate-900 line-clamp-1">{stats.highestCat}</p>
          </div>
        </div>
      </div>

      {/* Add Expense Form */}
      {isAdding && (
        <form onSubmit={handleAddExpense} className="bg-white border border-amber-100 rounded-lg p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
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
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
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
                lang="en-IN"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition shadow-md shadow-amber-500/20">
              Save Expense
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
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 cursor-pointer appearance-none transition"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

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

          {(search || filterCategory !== 'All' || filterFrom || filterTo) && (
            <button
              onClick={() => { setSearch(''); setFilterCategory('All'); setFilterFrom(''); setFilterTo(''); }}
              className="text-xs font-bold text-slate-400 hover:text-amber-600 transition p-2 rounded-lg hover:bg-amber-50"
            >
              Reset
            </button>
          )}
        </div>

        <div className="lg:ml-auto flex items-center justify-between lg:justify-end gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{filtered.length} Results</span>
          </div>
          <div className="w-px h-3 bg-slate-200 hidden sm:block mx-1" />
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Total: ₹{totalFiltered.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-x-auto">
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
            {filtered.map((expense) => (
              <tr key={expense._id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 text-slate-600">{format(new Date(expense.date), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{expense.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                    {expense.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">₹{expense.amount.toFixed(2)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  {expenses.length === 0 ? 'No expenses recorded yet.' : 'No results match your filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
