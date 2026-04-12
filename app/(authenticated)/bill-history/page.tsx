'use client';

import { useState, useEffect } from 'react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface BillItem { dishName: string; variantLabel: string; price: number; qty: number; }
interface Bill { 
  _id: string; 
  items: BillItem[]; 
  subtotal: number; 
  orderType?: string; 
  createdAt: string; 
  isDeleted?: boolean; 
  deletionReason?: string; 
}

export default function BillsPage() {
  const [user, setUser] = useState<{ department: string } | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch session
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(u => setUser(u));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle status/date reset
  useEffect(() => {
    setPage(1);
  }, [date, statusFilter]);

  // Fetch bills
  useEffect(() => {
    setLoading(true);
    let url = `/api/bills?page=${page}&limit=15&search=${debouncedSearch}&status=${statusFilter}`;
    if (date?.from) url += `&from=${date.from.toISOString()}`;
    if (date?.to) url += `&to=${date.to.toISOString()}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.bills) {
          setBills(data.bills);
          setTotalPages(data.pages);
          setTotalResults(data.total);
        } else {
          setBills(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
  }, [page, debouncedSearch, date]);

  const filteredBills = bills;

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  async function confirmDelete() {
    if (!deleteId || !deleteReason.trim()) return;
    setIsDeleting(true);

    try {
      const r = await fetch(`/api/bills/${deleteId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      if (r.ok) {
        const data = await r.json();
        setBills((prev) => {
          // If not admin, remove the deleted bill from the list entirely
          if (user?.department !== 'Admin') {
            return prev.filter((b) => b._id !== deleteId);
          }
          // If admin, update the bill to show it's deleted
          return prev.map((b) => b._id === deleteId ? { ...b, ...data.bill } : b);
        });
        setDeleteId(null);
        setDeleteReason('');
        toast.success('Bill successfully cancelled');
      } else {
        const data = await r.json();
        toast.error(data.error || 'Failed to delete bill');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('An error occurred while deleting the bill');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleReprint(bill: Bill) {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    const billNum = bill._id.slice(-6).toUpperCase();
    const rows = bill.items.map((i) => `
      <tr>
        <td style="padding:4px 0;padding-right:4px;">
          ${i.dishName}
          ${i.variantLabel && i.variantLabel !== 'Full' && i.variantLabel !== 'Per Piece' ? `<span style="display:block;font-size:8px;color:#333;">(${i.variantLabel})</span>` : ''}
        </td>
        <td style="text-align:center;padding:4px 0;width:32px;">${i.qty}</td>
        <td style="text-align:right;padding:4px 0;">₹${i.price.toFixed(2)}</td>
        <td style="text-align:right;padding:4px 0;">₹${(i.price * i.qty).toFixed(2)}</td>
      </tr>`).join('');

    w.document.write(`
      <html><head><title>Bill #${billNum}</title>
      <style>
        @page { margin: 0; }
        body {
          font-family: monospace;
          font-size: 10px;
          font-weight: normal;
          width: 100%;
          margin: 0;
          padding: 24px 16px;
          color: #000;
          -webkit-print-color-adjust: exact;
        }
        h2 { text-align: center; margin: 0 0 2px 0; font-size: 12px; text-transform: uppercase; font-weight: bold; }
        p { text-align: center; margin: 1px 0; line-height: 1.2; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0 8px; }
        th { border-bottom: 1px dashed #000; padding-bottom: 4px; font-weight: bold; }
        .flex { display: flex; justify-content: space-between; }
        .border-t-dashed { border-top: 1px dashed #000; }
        .border-t-solid { border-top: 1px solid #000; }
      </style></head><body>
      
      <h2>Indian Bakery & Restaurant</h2>
      <p>Dottappankulam, Sulthan Bathery</p>
      <p>Wayanad, 673692</p>
      <p style="margin-bottom:8px;">Ph: 04936212155, +91 8606086318</p>

      <div class="flex" style="border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:8px;align-items:flex-end;">
        <div>
          <div style="margin:1px 0;">Bill No: ZB${billNum}</div>
          <div style="margin:1px 0;">Type: ${bill.orderType || 'Dine-In'}</div>
        </div>
        <div style="text-align:right;">
          <div style="margin:1px 0;">${new Date(bill.createdAt).toLocaleDateString('en-IN')}</div>
          <div style="margin:1px 0;">${new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left;">Item</th>
            <th style="text-align:center;width:40px;">Qty</th>
            <th style="text-align:right;">Rate</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody style="vertical-align:top;">${rows}</tbody>
      </table>

      <div class="border-t-dashed" style="padding-top:4px;">
        <div class="flex">
          <span>Subtotal</span>
          <span>₹${bill.subtotal.toFixed(2)}</span>
        </div>
        <div class="flex border-t-solid" style="font-weight:bold;font-size:11px;padding-top:2px;margin-top:4px;">
          <span>GRAND TOTAL</span>
          <span>₹${bill.subtotal.toFixed(2)}</span>
        </div>
      </div>
      
      <div style="text-align:center;margin-top:16px;font-size:9px;">
        <div style="margin:2px 0;">Thank you for choosing us!</div>
        <div style="margin:2px 0;">Visit Again</div>
      </div>

      <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`);
    w.document.close();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-slate-100 pb-5">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-7 bg-amber-500 rounded-full" />
            {user?.department} Bill History
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and review your recorded bills.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search Bill No or Item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-10 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger
                id="date"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "flex-1 md:w-[260px] justify-start text-left font-normal h-10 rounded-xl border-slate-200 shadow-sm",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
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
                    <span>Pick a date range</span>
                  )}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden shadow-xl border-slate-200" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  disabled={(date: Date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            {date && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDate(undefined)}
                className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title="Clear date filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
            {[
              { label: 'Today', range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
              { label: 'Yesterday', range: { from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) } },
              { label: '7 Days', range: { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) } },
              { label: '30 Days', range: { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) } },
              { label: 'All Time', range: undefined }
            ].map((f) => {
              const isActive = (!f.range && !date) || 
                (f.range && date && date.from && date.to && 
                 isSameDay(f.range.from, date.from) && 
                 isSameDay(f.range.to, date.to));
              
              return (
                <button
                  key={f.label}
                  onClick={() => setDate(f.range)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                    isActive 
                      ? "bg-white text-amber-600 shadow-sm ring-1 ring-slate-200" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {user?.department === 'Admin' && (
          <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-200 rounded-xl w-fit shadow-sm">
            {[
              { id: 'all', label: 'All Bills' },
              { id: 'active', label: 'Active' },
              { id: 'deleted', label: 'Cancelled' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                  statusFilter === s.id 
                    ? "bg-white text-amber-600 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-base font-medium text-slate-500 mb-1">No bills found.</p>
          <p className="text-xs">Adjust your search or start billing from the POS screen.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredBills.map((bill, idx) => {
                const billNum = `ZB${bill._id.slice(-6).toUpperCase()}`;
                const isExpanded = expanded === bill._id;
                return (
                  <div key={bill._id}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : bill._id)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition text-left",
                        bill.isDeleted && "opacity-60 bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                        bill.isDeleted ? "bg-slate-200 text-slate-500" : "bg-amber-100 text-amber-700"
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium text-slate-800",
                          bill.isDeleted && "line-through text-slate-500"
                        )}>
                          {billNum}
                          {bill.isDeleted && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] uppercase font-bold">Cancelled</span>
                          )}
                          {user?.department !== 'Bakery' && !bill.isDeleted && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">{bill.orderType || 'Dine-In'}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(bill.createdAt)} <span className="opacity-50 mx-1">•</span> {bill.items.reduce((s, i) => s + i.qty, 0)} items</p>
                      </div>
                      <span className={cn(
                        "text-base font-bold text-slate-800 flex-shrink-0",
                        bill.isDeleted && "line-through opacity-50"
                      )}>₹{bill.subtotal.toFixed(2)}</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 bg-slate-50/60">
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white overflow-x-auto">
                          <table className="w-full text-sm min-w-[500px]">
                            <thead className="bg-slate-50 text-xs text-slate-500 font-medium border-b border-slate-200">
                              <tr>
                                <th className="text-left px-4 py-2">Item</th>
                                <th className="text-center px-4 py-2">Qty</th>
                                <th className="text-right px-4 py-2">Rate</th>
                                <th className="text-right px-4 py-2">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {bill.items.map((item, i) => (
                                <tr key={i}>
                                  <td className="px-4 py-2 text-slate-700">
                                    <div className="flex items-center gap-1">
                                      {item.dishName}
                                      {item.variantLabel && item.variantLabel !== 'Full' && item.variantLabel !== 'Per Piece' && (
                                        <span className="text-slate-400 text-xs block">({item.variantLabel})</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-center text-slate-600">{item.qty}</td>
                                  <td className="px-4 py-2 text-right text-slate-600">₹{item.price.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right text-slate-700 font-medium">₹{(item.price * item.qty).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                                <td className="px-4 py-2 text-slate-600" colSpan={3}>Subtotal</td>
                                <td className="px-4 py-2 text-right text-slate-700">₹{bill.subtotal.toFixed(2)}</td>
                              </tr>
                              <tr className="bg-amber-50 font-bold border-t border-amber-100 text-base">
                                <td className="px-4 py-3 text-amber-900" colSpan={3}>Grand Total</td>
                                <td className="px-4 py-3 text-right text-amber-900">₹{bill.subtotal.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <div className="flex justify-end gap-3 items-center mt-3">
                          <button
                            onClick={() => handleReprint(bill)}
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-amber-700 transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Reprint Bill
                          </button>
                          {bill.isDeleted ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Cancellation Reason:</span>
                              <span className="text-sm italic text-slate-600 bg-red-50/50 p-2 rounded-md border border-red-100">{bill.deletionReason || 'No reason provided'}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteId(bill._id)}
                              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-500 transition"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Delete Bill
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                <p className="text-sm text-slate-500 font-medium whitespace-nowrap">
                  Showing Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span> 
                  <span className="ml-1 text-[10px] opacity-60 uppercase">({totalResults} total)</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-600 disabled:opacity-50 rounded-lg shadow-sm"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-600 disabled:opacity-50 rounded-lg shadow-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Cancel Bill</DialogTitle>
            <DialogDescription className="text-slate-500">
              Please provide a reason for cancelling this bill.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter cancellation reason..."
              value={deleteReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeleteReason(e.target.value)}
              className="min-h-[100px] border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 text-slate-900"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setDeleteId(null)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={confirmDelete}
              disabled={!deleteReason.trim() || isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
            >
              {isDeleting ? 'Processing...' : 'Confirm Deletion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
