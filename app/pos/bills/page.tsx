'use client';

import { useState, useEffect } from 'react';

interface BillItem { dishName: string; variantLabel: string; price: number; qty: number; }
interface Bill { _id: string; items: BillItem[]; subtotal: number; orderType?: string; createdAt: string; }

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bills')
      .then((r) => r.json())
      .then((data) => { setBills(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
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
        <td style="text-align:right;padding:4px 0;">${i.price.toFixed(2)}</td>
        <td style="text-align:center;padding:4px 0;">${i.qty}</td>
        <td style="text-align:right;padding:4px 0;">${(i.price * i.qty).toFixed(2)}</td>
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
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
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
            <th style="text-align:right;">Rate</th>
            <th style="text-align:center;width:32px;">Qty</th>
            <th style="text-align:right;">Amt</th>
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
    <div className="max-w-3xl mx-auto p-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bill History</h1>
        <p className="text-sm text-slate-500 mt-0.5">Last 50 bills — most recent first.</p>
      </div>

      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-sm">No bills yet. Start billing from the Cashier screen.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {bills.map((bill, idx) => {
              const billNum = `ZB${bill._id.slice(-6).toUpperCase()}`;
              const isExpanded = expanded === bill._id;
              return (
                <div key={bill._id}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : bill._id)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{billNum} <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">{bill.orderType || 'Dine-In'}</span></p>
                      <p className="text-xs text-slate-500">{formatDate(bill.createdAt)} · {bill.items.reduce((s, i) => s + i.qty, 0)} items</p>
                    </div>
                    <span className="text-base font-bold text-slate-800 flex-shrink-0">₹{bill.subtotal.toFixed(0)}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-slate-50/60">
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-xs text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                              <th className="text-left px-4 py-2">Item</th>
                              <th className="text-right px-4 py-2">Rate</th>
                              <th className="text-center px-2 py-2">Qty</th>
                              <th className="text-right px-4 py-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bill.items.map((item, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-slate-700">{item.dishName} 
                                  {item.variantLabel && item.variantLabel !== 'Full' && item.variantLabel !== 'Per Piece' && (
                                    <span className="text-slate-400 text-xs block">({item.variantLabel})</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right text-slate-600">₹{item.price.toFixed(0)}</td>
                                <td className="px-2 py-2 text-center text-slate-600">{item.qty}</td>
                                <td className="px-4 py-2 text-right text-slate-700">₹{(item.price * item.qty).toFixed(0)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                              <td className="px-4 py-2 text-slate-600" colSpan={3}>Subtotal</td>
                              <td className="px-4 py-2 text-right text-slate-700">₹{bill.subtotal.toFixed(0)}</td>
                            </tr>
                            <tr className="bg-amber-50 font-bold border-t border-amber-100 text-base">
                              <td className="px-4 py-3 text-amber-900" colSpan={3}>Grand Total</td>
                              <td className="px-4 py-3 text-right text-amber-900">₹{bill.subtotal.toFixed(0)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <button
                        onClick={() => handleReprint(bill)}
                        className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 hover:text-amber-700 font-medium transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Reprint Bill
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
