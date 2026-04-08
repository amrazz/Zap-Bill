'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';

interface Variant { label: string; price: number; }
interface Dish { _id: string; name: string; department: 'Restaurant' | 'Bakery'; imageUrl?: string; variants: Variant[]; }
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
    <div ref={printRef} className="hidden print:block font-mono font-normal text-[10px] p-4 pt-6 w-full text-black">
      <div className="text-center mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-1">Indian Bakery & Restaurant</h2>
        <p>Dottappankulam, Sulthan Bathery</p>
        <p>Wayanad, 673692</p>
        <p className="mt-1">Ph: 04936212155, +91 8606086318</p>
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

      <table className="w-full mb-2">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left pb-1 font-normal uppercase">Item</th>
            <th className="text-right pb-1 font-normal uppercase">Rate</th>
            <th className="text-center pb-1 w-8 font-normal uppercase">Qty</th>
            <th className="text-right pb-1 font-normal uppercase">Amt</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-1 pr-1">
                {item.dishName}
                {item.variantLabel && item.variantLabel !== 'Full' && item.variantLabel !== 'Per Piece' && (
                  <span className="block text-[8px] text-gray-600">({item.variantLabel})</span>
                )}
              </td>
              <td className="py-1 text-right">{item.price.toFixed(2)}</td>
              <td className="py-1 text-center">{item.qty}</td>
              <td className="py-1 text-right">{(item.price * item.qty).toFixed(2)}</td>
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
  const [qty, setQty] = useState(1);

  function handleAdd() {
    if (!selected) return;
    onAdd({ dishId: dish._id, dishName: dish.name, variantLabel: selected.label, price: selected.price, qty });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">{dish.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Variants */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Select Variant</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {dish.variants.map((v) => (
            <button
              key={v.label}
              onClick={() => setSelected(v)}
              className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                selected?.label === v.label
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>{v.label}</div>
              <div className="text-xs font-semibold mt-0.5">₹{v.price}</div>
            </button>
          ))}
        </div>

        {/* Qty stepper */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-slate-700">Quantity</span>
          <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white shadow-sm text-slate-800 font-bold text-lg flex items-center justify-center hover:bg-slate-50">−</button>
            <span className="w-8 text-center font-semibold text-slate-800">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm text-slate-800 font-bold text-lg flex items-center justify-center hover:bg-slate-50">+</button>
          </div>
        </div>

        {/* Add button */}
        <button
          id="add-to-order-btn"
          onClick={handleAdd}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
        >
          Add to Order
          {selected && <span className="text-amber-100">— ₹{(selected.price * qty).toFixed(0)}</span>}
        </button>
      </div>
    </div>
  );
}

// ── Main POS Page ────────────────────────────────────────────────
export default function PosPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeDepartment, setActiveDepartment] = useState<'Restaurant' | 'Bakery'>('Restaurant');
  const [orderType, setOrderType] = useState('Dine-In');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const [lastBillNumber, setLastBillNumber] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/dishes')
      .then((r) => r.json())
      .then((data) => { setDishes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredDishes = dishes.filter((d) => d.department === activeDepartment);

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
    setCart((prev) => prev.map((c, i) => i === idx ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  function printBill() {
    window.print();
  }

  function handleSaveAndPrint() {
    const billNum = `ZB${Date.now().toString().slice(-6)}`;
    setLastBillNumber(billNum);

    startSaving(async () => {
      await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, subtotal, orderType }),
      });
      // Wait a tick for state to settle before printing, so the cart is still there
      setTimeout(() => {
        printBill();
        setCart([]);
      }, 100);
    });
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

      {/* Variant modal */}
      {selectedDish && (
        <VariantModal dish={selectedDish} onAdd={addToCart} onClose={() => setSelectedDish(null)} />
      )}

      <div className="print:hidden flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* ── Left: Dishes ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
          {/* Department Tabs */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-slate-100">
            {['Restaurant', 'Bakery'].map((dept) => (
              <button
                key={dept}
                onClick={() => setActiveDepartment(dept as 'Restaurant' | 'Bakery')}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                  activeDepartment === dept
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dept} Menu
              </button>
            ))}
          </div>

          {/* Dish Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-sm">No dishes in this department.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDishes.map((dish) => (
                  <button
                    key={dish._id}
                    id={`dish-${dish._id}`}
                    onClick={() => setSelectedDish(dish)}
                    className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden text-left hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
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
                          {dish.variants.length === 1
                            ? `₹${dish.variants[0].price}`
                            : `₹${Math.min(...dish.variants.map((v) => v.price))}+`}
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
        <div className="w-80 xl:w-96 flex flex-col bg-white">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Current Order</h2>
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
                    <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center justify-center transition">−</button>
                    <span className="w-5 text-center text-sm font-semibold text-slate-800">{item.qty}</span>
                    <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center justify-center transition">+</button>
                    <button onClick={() => removeFromCart(idx)} className="w-6 h-6 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center ml-1 transition">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 w-14 text-right">₹{(item.price * item.qty).toFixed(0)}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer Total + Print */}
          <div className="border-t border-slate-100 p-4 space-y-4">
            
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Order Type</p>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['Dine-In', 'Takeaway', 'Delivery'].map(type => (
                  <button key={type} onClick={() => setOrderType(type)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${orderType === type ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-600">{cart.reduce((s, c) => s + c.qty, 0)} item(s)</span>
              <div className="text-right">
                <p className="text-xs text-slate-400">Grand Total</p>
                <p className="text-2xl font-bold text-slate-900">₹{subtotal.toFixed(0)}</p>
              </div>
            </div>
            <button
              id="print-bill-btn"
              disabled={cart.length === 0 || isSaving}
              onClick={handleSaveAndPrint}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2"
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
