'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StaffUser {
  _id: string;
  username: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const fetchStaff = () => {
    fetch('/api/staff')
      .then((r) => r.json())
      .then((data) => { setStaff(Array.isArray(data) ? data : []); setLoading(false); });
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Username and password are required');
      return;
    }

    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Staff account "${username}" created`);
      setUsername('');
      setPassword('');
      setIsAdding(false);
      fetchStaff();
    } else {
      toast.error(data.error || 'Failed to create staff account');
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove staff account "${name}"? They will no longer be able to log in.`)) return;
    const res = await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Staff account removed');
      fetchStaff();
    } else {
      toast.error(data.error || 'Failed to remove staff account');
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
    <div className="px-4 md:px-10 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-7 bg-amber-500 rounded-full" />
            Staff Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">Billing staff can only access the checkout screen and their own bill history.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Staff Account
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white border border-amber-100 rounded-lg p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. billing1"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition shadow-md shadow-amber-500/20">
              Create Account
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Username</th>
              <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Role</th>
              <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Created</th>
              <th className="text-right px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-medium text-slate-800">{u.username}</td>
                <td className="px-6 py-4">
                  {u.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                      <Users className="w-3 h-3" /> Staff
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">{format(new Date(u.createdAt), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleRemove(u._id, u.username)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
