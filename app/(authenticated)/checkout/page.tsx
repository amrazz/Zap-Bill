'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, ArrowLeft, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Variant { label: string; price: number; }
interface Dish { _id: string; name: string; department: 'Restaurant' | 'Bakery'; category?: string; imageUrl?: string; variants: Variant[]; }
interface CartItem { dishId: string; dishName: string; variantLabel: string; price: number; qty: number; }

// ── Printable Bill ──────────────────────────────────────────────
function BillPrint({ items, subtotal, billNumber, orderType, printRef }: {
  items: CartItem[];
  subtotal: number;
  billNumber: string;
  orderType: string;
  printRef: React.RefObject<HTMLDivElement | null>;
}) {
  const now = new Date();
  return (
    <div ref={printRef} className="hidden print:block font-mono font-normal text-[11px] p-4 pt-6 w-full text-black">
      <div className="text-center mb-4">
        <h2 className="text-base font-bold uppercase tracking-tight mb-1">Indian Bakery & Restaurant</h2>
        <p>Sulthan Bathery, Wayanad</p>
        <p className="mt-1">Ph: +91 8606086318, 04936 212155</p>
      </div>

      <div className="flex justify-between items-end border-b border-dashed border-black pb-2 mb-2">
        <div>
          <p>Bill No: ZB{billNumber}</p>
          <p>Type: {orderType}</p>
        </div>
        <div className="text-right">
          <p>{now.toLocaleDateString('en-IN')}</p>
          <p>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <table className="w-full mt-4 mb-2">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left pb-1 font-normal uppercase">Item</th>
            <th className="text-center pb-1 w-12 font-normal uppercase">Qty</th>
            <th className="text-right pb-1 font-normal uppercase">Rate</th>
            <th className="text-right pb-1 font-normal uppercase">Amount</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-1 pr-1 font-bold">
                {item.dishName}
                {item.variantLabel && item.variantLabel !== 'Full' && item.variantLabel !== 'Per Piece' && (
                  <span className="block text-[8px] font-normal">({item.variantLabel})</span>
                )}
              </td>
              <td className="py-1 text-center">
                {item.variantLabel.toLowerCase().includes('kg') ? item.qty.toFixed(3) : item.qty}
              </td>
              <td className="py-1 text-right">₹{item.price.toFixed(2)}</td>
              <td className="py-1 text-right">₹{(item.price * item.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black pt-2 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-xs mt-1 border-t border-black pt-1">
          <span>GRAND TOTAL</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center mt-6 space-y-1 text-[9px]">
        <p>Thank you for choosing us!</p>
        <p>Visit Again</p>
      </div>
    </div>
  );
}

// ── Variant Picker Modal ─────────────────────────────────────────
function VariantModal({ dish, onAdd, onClose }: {
  dish: Dish;
  onAdd: (item: CartItem) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Variant | null>(dish.variants[0] ?? null);
  const [qty, setQty] = useState<number>(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWeightBased = selected?.label.toLowerCase().includes('kg');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [selected]);

  const handleAdd = () => {
    if (!selected) return;

    // Always treat weight-based input as grams and convert to kg
    const finalQty = isWeightBased ? qty / 1000 : qty;

    if (finalQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    onAdd({
      dishId: dish._id,
      dishName: dish.name,
      variantLabel: selected.label,
      price: selected.price,
      qty: finalQty
    });
    onClose();
  };

  const resultKg = isWeightBased ? (qty / 1000) : qty;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <form
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-lg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">{dish.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Variants */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Select Variant</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {dish.variants.map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={() => {
                setSelected(v);
                if (v.label.toLowerCase().includes('kg')) {
                  setQty(250); // Default to 250g
                } else {
                  setQty(1);
                }
              }}
              className={`flex-1 min-w-[80px] py-1.5 px-3 rounded-lg border text-sm font-medium transition ${selected?.label === v.label
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div>{v.label}</div>
              <div className="text-xs font-semibold mt-0.5">₹{v.price}</div>
            </button>
          ))}
        </div>

        {/* Qty Section */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              {isWeightBased ? 'Weight (in Grams)' : 'Quantity'}
            </span>
            {isWeightBased && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
                Result: {resultKg.toFixed(3)} kg
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-2">
            {!isWeightBased && (
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm text-slate-800 font-bold text-xl flex items-center justify-center hover:bg-slate-50"
              >
                −
              </button>
            )}
            <input
              ref={inputRef}
              type="number"
              step={isWeightBased ? "any" : "1"}
              min="0.001"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className="flex-1 text-center font-bold text-slate-800 text-lg bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {!isWeightBased && (
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-10 h-10 rounded-lg bg-white shadow-sm text-slate-800 font-bold text-xl flex items-center justify-center hover:bg-slate-50"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Add button */}
        <button
          type="submit"
          className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-base transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          Add to Order
          {selected && <span className="text-amber-100">— ₹{(selected.price * resultKg).toFixed(2)}</span>}
        </button>
      </form>
    </div>
  );
}

function PrintPreviewModal({ items, subtotal, billNumber, orderType, onConfirm, onCancel, isSaving }: {
  items: CartItem[];
  subtotal: number;
  billNumber: string;
  orderType: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const now = new Date();
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-amber-500 px-5 py-4 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Review & Finalize
          </h3>
          <button onClick={onCancel} className="text-white/80 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Receipt Simulation */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm font-mono text-[11px] text-slate-900 space-y-4">
            <div className="text-center space-y-0.5">
              <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">Indian Bakery & Restaurant</p>
              <p>Sulthan Bathery, Wayanad</p>
              <p>Ph: +91 8606086318</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 py-2 flex justify-between uppercase">
              <div>
                <p>Bill: ZB{billNumber}</p>
                <p>Type: {orderType}</p>
              </div>
              <div className="text-right">
                <p>{now.toLocaleDateString('en-IN')}</p>
                <p>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-slate-600">
                  <th className="text-left py-1 font-normal uppercase">Item</th>
                  <th className="text-right py-1 font-normal uppercase">Qty</th>
                  <th className="text-right py-1 font-normal uppercase">Rate</th>
                  <th className="text-right py-1 font-normal uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 text-slate-900">
                    <td className="py-2">
                      <p className="font-bold">{item.dishName}</p>
                      {item.variantLabel !== 'Full' && item.variantLabel !== 'Per Piece' && (
                        <p className="text-[9px] font-normal">({item.variantLabel})</p>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {item.variantLabel.toLowerCase().includes('kg') ? item.qty.toFixed(3) : item.qty}
                    </td>
                    <td className="py-2 text-right">₹{item.price.toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">₹{(item.price * item.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 border-slate-900 pt-3 space-y-1">
              <div className="flex justify-between font-bold text-sm text-slate-900">
                <span>GRAND TOTAL</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 grid grid-cols-2 gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Edit Order
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSaving}
            className="h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 text-white transition-all active:scale-[0.98]"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Confirm & Print'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main POS Page ────────────────────────────────────────────────
export default function PosPage() {
  const [user, setUser] = useState<{ username: string; department: 'Restaurant' | 'Bakery' } | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeDepartment, setActiveDepartment] = useState<'Restaurant' | 'Bakery'>('Restaurant');
  const [orderType, setOrderType] = useState('Dine-In');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastBillNumber, setLastBillNumber] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Define direct print logic — uses a hidden iframe so the system print
  // dialog always opens at full screen size (no clipped popup issue).
  const triggerDirectPrint = (bill: { items: any[], subtotal: number, billNumber: string, orderType: string, department: string }) => {
    // Remove any previous iframe
    document.getElementById('zb-print-frame')?.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'zb-print-frame';
    // Visually hidden but still in the DOM so printing works
    Object.assign(iframe.style, {
      position: 'fixed', top: '-9999px', left: '-9999px',
      width: '80mm', height: '1px', border: 'none', visibility: 'hidden',
    });
    document.body.appendChild(iframe);

    const rows = bill.items.map(i => `
      <tr>
        <td style="padding:4px 0;vertical-align:top;">
          <div style="font-size:14px;color:#000;">
            <div style="font-weight:normal;">${i.dishName}</div>
            ${i.variantLabel !== 'Full' && i.variantLabel !== 'Per Piece'
              ? `<div style="font-size:11px;">(${i.variantLabel})</div>`
              : ''}
          </div>
        </td>
        <td style="text-align:center;font-size:13px;vertical-align:top;padding-top:4px;color:#000;">${i.variantLabel.toLowerCase().includes('kg') ? i.qty.toFixed(3) : i.qty}</td>
        <td style="text-align:right;font-size:13px;vertical-align:top;padding-top:4px;color:#000;">&#8377;${i.price.toFixed(2)}</td>
        <td style="text-align:right;font-size:13px;vertical-align:top;padding-top:4px;font-weight:bold;color:#000;">&#8377;${(i.price * i.qty).toFixed(2)}</td>
      </tr>
    `).join('');

    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      /* ── Page: 80mm thermal, zero browser margins ── */
      @page {
        size: 80mm auto;
        margin: 4mm 3mm;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        line-height: 1.35;
        width: 100%;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .center { text-align: center; }
      .row    { display: flex; justify-content: space-between; }
      .dash   { border-top: 1.5px dashed #000; margin: 8px 0; }
      .solid  { border-top: 2px solid #000; margin: 8px 0 0; }
      table   { width: 100%; border-collapse: collapse; margin: 20px 0 10px; }
      th {
        text-align: left; font-size: 11px; font-weight: normal;
        text-transform: uppercase; border-bottom: 1.5px dashed #000;
        padding-bottom: 5px;
        color: #000;
      }
      td { vertical-align: top; }
    </style></head><body>

    <!-- Header -->
    <div class="center" style="margin-bottom:10px; color:#000;">
      <div style="font-size:18px;font-weight:bold;">INDIAN BAKERY &amp; RESTAURANT</div>
      <div style="font-size:12px;margin-top:2px;">Sulthan Bathery, Wayanad</div>
      <div style="font-size:12px;">Ph: +91 8606086318, 04936 212155</div>
    </div>

    <!-- Bill meta -->
    <div class="dash"></div>
    <div class="row" style="font-size:12px; margin-bottom:10px; color:#000;">
      <div>
        <div>No: ZB${bill.billNumber}</div>
        ${bill.department !== 'Bakery' ? `<div>Mode: ${bill.orderType}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div>${new Date().toLocaleDateString('en-IN')}</div>
        <div>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>

    <!-- Items table -->
    <table>
      <thead>
        <tr>
          <th style="width:40%;">Item</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Rate</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <!-- Totals -->
    <div class="dash" style="margin-top:4px;"></div>
    <div class="row" style="font-size:12px;padding:2px 0;">
      <span>Subtotal</span><span>&#8377;${bill.subtotal.toFixed(2)}</span>
    </div>
    <div class="solid"></div>
    <div class="row" style="font-weight:bold;font-size:15px;padding:6px 0 0;">
      <span>GRAND TOTAL</span><span>&#8377;${bill.subtotal.toFixed(2)}</span>
    </div>

    <!-- Footer -->
    <div class="dash" style="margin-top:24px;"></div>
    <div class="center" style="font-size:11px;font-weight:bold;text-transform:uppercase;padding-bottom:6px;">
      Thank you, Visit Again!
    </div>

    </body></html>`);
    doc.close();

    // Wait for fonts/layout to settle, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Clean up after the dialog closes
        setTimeout(() => iframe.remove(), 2000);
      }, 250);
    };
    // Fallback if onload already fired
    setTimeout(() => {
      if (document.getElementById('zb-print-frame')) {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 2000);
      }
    }, 600);
  };

  useEffect(() => {
    // Fetch session first
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(u => {
        if (u.department) {
          setUser(u);
          setActiveDepartment(u.department);
        }
      });

    fetch('/api/dishes')
      .then((r) => r.json())
      .then((data) => { setDishes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredDishes = dishes.filter((d) =>
    d.department === activeDepartment &&
    (activeCategoryFilter === 'All' || (d.category || "common") === activeCategoryFilter) &&
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCategories = Array.from(
    new Set(dishes.filter(d => d.department === activeDepartment).map((i) => i.category || "common"))
  ).sort();

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const key = `${item.dishId}-${item.variantLabel}`;
      const existing = prev.find((c) => `${c.dishId}-${c.variantLabel}` === key);
      if (existing) {
        return prev.map((c) => `${c.dishId}-${c.variantLabel}` === key ? { ...c, qty: c.qty + item.qty } : c);
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));
  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => prev.map((c, i) => i === idx ? { ...c, qty: Math.max(0.001, c.qty + delta) } : c));
  };
  const setAbsQty = (idx: number, val: number) => {
    setCart((prev) => prev.map((c, i) => i === idx ? { ...c, qty: Math.max(0.001, val) } : c));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  function handleSaveAndPrint() {
    const billNum = `${Date.now().toString().slice(-6)}`;
    setLastBillNumber(billNum);
    setShowPreview(true);
  }

  async function finalizeOrder() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, subtotal, orderType }),
      });

      if (res.ok) {
        // Capture current cart data for printing BEFORE clearing state
        const printData = {
          items: [...cart],
          subtotal,
          billNumber: lastBillNumber,
          orderType,
          department: activeDepartment
        };

        // 1. Reset state and close modal immediately so UI feels responsive
        setCart([]);
        setShowPreview(false);
        setIsSaving(false);

        // 2. Trigger print with a slight delay to ensure the modal unmounts
        // This prevents the browser from freezing on the "Saving..." screen
        setTimeout(() => {
          triggerDirectPrint(printData);
        }, 150);

        toast.success("Bill saved and printed successfully");
      } else {
        toast.error("Failed to save bill. Please try again.");
        setIsSaving(false);
      }
    } catch (err) {
      toast.error("An error occurred while saving.");
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading dishes…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-only bill */}
      <BillPrint items={cart.length > 0 ? cart : []} subtotal={subtotal} billNumber={lastBillNumber} orderType={orderType} printRef={printRef} />

      {/* Finalize/Preview modal */}
      {showPreview && (
        <PrintPreviewModal
          items={cart}
          subtotal={subtotal}
          billNumber={lastBillNumber}
          orderType={orderType}
          onConfirm={finalizeOrder}
          onCancel={() => setShowPreview(false)}
          isSaving={isSaving}
        />
      )}

      {/* Variant modal */}
      {selectedDish && (
        <VariantModal dish={selectedDish} onAdd={addToCart} onClose={() => setSelectedDish(null)} />
      )}

      <div className="print:hidden flex-1 flex h-full overflow-hidden relative">
        {/* ── Left: Dishes ── */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden border-r border-slate-200 transition-all",
          isCartMobileOpen ? "hidden lg:flex" : "flex"
        )}>
          {/* Department Header & Search */}
          <div className="px-5 py-4 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-amber-500 rounded-full" />
              {activeDepartment} Menu
            </h2>
            <div className="relative w-full md:w-64 xl:w-80">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto px-5 py-2.5 custom-scrollbar shrink-0">
            <button
              onClick={() => setActiveCategoryFilter("All")}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategoryFilter === "All"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
            >
              All Items
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategoryFilter === cat
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dish Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {filteredDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-sm">No dishes in this department.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredDishes.map((dish) => (
                  <button
                    key={dish._id}
                    id={`dish-${dish._id}`}
                    onClick={() => setSelectedDish(dish)}
                    className="group flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden text-left hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    {dish.imageUrl ? (
                      <div className="w-full aspect-4/3 bg-slate-100 overflow-hidden">
                        <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="w-full aspect-4/3 bg-slate-50 flex items-center justify-center group-hover:bg-amber-50/50 transition-colors">
                        <svg className="w-10 h-10 text-slate-300 group-hover:text-amber-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-3.5 flex flex-col flex-1">
                      <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-1">{dish.name}</p>
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <p className="text-sm text-amber-600 font-extrabold">
                          {(() => {
                            const vars = dish.variants;
                            if (vars.length === 0) return '₹0';

                            // Find preferred variant: Full > Per Piece > KG based > first
                            const best = vars.find(v => v.label.toLowerCase() === 'full')
                              || vars.find(v => v.label.toLowerCase() === 'per piece')
                              || vars.find(v => v.label.toLowerCase().includes('kg'))
                              || vars[0];

                            let label = `₹${best.price}`;
                            if (best.label.toLowerCase().includes('kg')) {
                              label += ' / KG';
                            } else if (vars.length > 1 && best.label.toLowerCase() === 'full') {
                              label += ' (Full)';
                            } else if (vars.length > 1) {
                              label += '+';
                            }

                            return label;
                          })()}
                        </p>
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart ── */}
        {/* Floating Cart Button (Mobile Only) */}
        {!isCartMobileOpen && cart.length > 0 && (
          <div className="lg:hidden fixed bottom-20 left-0 right-0 px-4 z-40 animate-in fade-in slide-in-from-bottom-5">
            <button 
              onClick={() => setIsCartMobileOpen(true)}
              className="w-full bg-amber-500 text-white h-14 rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-between px-6 font-bold"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span>{cart.length} Items</span>
              </div>
              <span>View Order — ₹{subtotal.toFixed(0)}</span>
            </button>
          </div>
        )}

        <div className={cn(
          "flex flex-col bg-white shrink-0 border-l border-slate-200 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] h-full transition-all duration-300",
          "fixed inset-0 z-50 lg:relative lg:inset-auto lg:w-80 xl:w-96 lg:translate-x-0 lg:flex",
          isCartMobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCartMobileOpen(false)}
                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-800">Current Order</h2>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-slate-400 hover:text-red-500 transition">Clear all</button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <p className="text-sm">No items added yet</p>
                <p className="text-xs">Tap a dish to add</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.dishName}</p>
                    <p className="text-xs text-slate-500">{item.variantLabel} — ₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(idx, item.variantLabel.toLowerCase().includes('kg') ? -0.1 : -1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center justify-center transition">−</button>
                    <input
                      type="number"
                      step={item.variantLabel.toLowerCase().includes('kg') ? "0.001" : "1"}
                      min="0.001"
                      value={item.qty}
                      onChange={(e) => setAbsQty(idx, parseFloat(e.target.value) || 0)}
                      className="w-10 text-center text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button onClick={() => updateQty(idx, item.variantLabel.toLowerCase().includes('kg') ? 0.1 : 1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center justify-center transition">+</button>
                    <button onClick={() => removeFromCart(idx)} className="w-6 h-6 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center ml-1 transition">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 w-14 text-right">₹{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer Total + Print */}
          <div className="border-t border-slate-100 bg-slate-50 p-4 pb-24 lg:pb-4 space-y-4 shrink-0 mt-auto">

            {activeDepartment !== 'Bakery' && (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">Order Type</p>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['Dine-In', 'Takeaway', 'Delivery'].map(type => (
                    <button key={type} onClick={() => setOrderType(type)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${orderType === type ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-600">{cart.length} item(s)</span>
              <div className="text-right">
                <p className="text-xs text-slate-400">Grand Total</p>
                <p className="text-2xl font-bold text-slate-900">₹{subtotal.toFixed(0)}</p>
              </div>
            </div>
            <button
              id="print-bill-btn"
              disabled={cart.length === 0 || isSaving}
              onClick={handleSaveAndPrint}
              className="w-full py-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {isSaving ? 'Saving…' : 'Save & Print Bill'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
