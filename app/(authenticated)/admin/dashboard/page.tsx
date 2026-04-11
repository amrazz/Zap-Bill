"use client"
import {
  TrendingUp, TrendingDown, Users, Receipt,
  Wallet, DollarSign, ArrowUpRight, ArrowDownRight,
  Calendar as CalendarIcon, ChevronDown
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  format, startOfDay, endOfDay, startOfMonth, endOfMonth,
  subDays, isSameDay, startOfYesterday, endOfYesterday
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useState } from 'react';

interface Stats {
  summary: {
    totalSales: number;
    totalExpenses: number;
    totalSalaries: number;
    netProfit: number;
  };
  chartData: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'last7' | 'month' | 'custom'>('month');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        let url = '/api/admin/stats';
        if (date?.from) {
          const from = date.from.toISOString();
          const to = (date.to || date.from).toISOString();
          url += `?from=${from}&to=${to}`;
        }
        const r = await fetch(url);
        const data = await r.json();
        setStats(data);
      } catch (error) {
        console.error('Fetch stats error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [date]);

  const setRange = (type: 'today' | 'yesterday' | 'last7' | 'month') => {
    const now = new Date();
    setFilterType(type);
    if (type === 'today') {
      setDate({ from: startOfDay(now), to: endOfDay(now) });
    } else if (type === 'yesterday') {
      setDate({ from: startOfYesterday(), to: endOfYesterday() });
    } else if (type === 'last7') {
      setDate({ from: subDays(startOfDay(now), 7), to: endOfDay(now) });
    } else if (type === 'month') {
      setDate({ from: startOfMonth(now), to: endOfMonth(now) });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const { summary, chartData } = stats;

  const cards = [
    { title: 'Total Sales', value: `₹${summary.totalSales.toLocaleString()}`, icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Expenses', value: `₹${summary.totalExpenses.toLocaleString()}`, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Salaries', value: `₹${summary.totalSalaries.toLocaleString()}`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Net Profit', value: `₹${summary.netProfit.toLocaleString()}`, icon: DollarSign, color: summary.netProfit >= 0 ? 'text-amber-600' : 'text-red-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="px-4 md:px-10 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-7 bg-amber-500 rounded-full" />
            Business Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">Real-time performance analytics for Bakery and Restaurant.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setRange('today')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
              filterType === 'today' ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Today
          </button>
          <button
            onClick={() => setRange('yesterday')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
              filterType === 'yesterday' ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Yesterday
          </button>
          <button
            onClick={() => setRange('last7')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
              filterType === 'last7' ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setRange('month')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
              filterType === 'month' ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            This Month
          </button>

          <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block" />

          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-8 justify-start text-left font-bold text-xs rounded-lg border-none hover:bg-slate-50 whitespace-nowrap",
                filterType === 'custom' && "text-amber-700 bg-amber-50",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              <span className="truncate">
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd")} - {format(date.to, "LLL dd")}
                    </>
                  ) : (
                    format(date.from, "LLL dd")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </span>
              <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-lg border-slate-200 shadow-xl" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(range: DateRange | undefined) => {
                  setDate(range);
                  if (range) setFilterType('custom');
                }}
                numberOfMonths={2}
                disabled={(date: Date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={filterType + (date?.from?.toISOString() || '')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
              <div key={i} className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <h3 className="font-bold text-slate-800">Sales vs Expenses</h3>
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Sales</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> Expenses</div>
                </div>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(val: number | string) => `₹${val}`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="expenses" stroke="#cbd5e1" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6">Financial Summary</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Monthly Sales</p>
                      <p className="text-sm font-bold text-slate-700">₹{summary.totalSales.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100 transition">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Fixed Salaries</p>
                      <p className="text-sm font-bold text-slate-700">₹{summary.totalSalaries.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Other Expenses</p>
                      <p className="text-sm font-bold text-slate-700">₹{summary.totalExpenses.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Estimated Net Profit</p>
                    <div className="flex items-baseline gap-1">
                      <p className={`text-xl font-black ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{summary.netProfit.toLocaleString()}</p>
                      <span className="text-[10px] text-slate-400 font-medium">INR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
