'use client';

import { useState, useEffect, useTransition } from 'react';
import { X, ImagePlus, Loader2, Plus } from 'lucide-react';

interface Variant { label: string; price: number | string; }
interface Dish { _id: string; name: string; department: 'Restaurant' | 'Bakery'; imageUrl?: string; isAvailable: boolean; variants: Variant[]; }

const PRESET_VARIANTS = {
  'Quarter/Half/Full': [
    { label: 'Quarter', price: '' },
    { label: 'Half', price: '' },
    { label: 'Full', price: '' },
  ],
  'Per Piece': [{ label: 'Per Piece', price: '' }],
  'Custom': [{ label: '', price: '' }],
};

function emptyDish() {
  return { name: '', department: 'Restaurant' as 'Restaurant' | 'Bakery', imageUrl: '', variants: [{ label: 'Quarter', price: '' }, { label: 'Half', price: '' }, { label: 'Full', price: '' }] as Variant[] };
}

export default function AdminPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState(emptyDish());
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchDishes = async () => {
    setLoading(true);
    const res = await fetch('/api/dishes');
    const data = await res.json();
    setDishes(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchDishes(); }, []);

  function handleVariantChange(idx: number, field: 'label' | 'price', value: string) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v),
    }));
  }

  function addVariant() {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, { label: '', price: '' }] }));
  }

  function removeVariant(idx: number) {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));
  }

  function applyPreset(preset: keyof typeof PRESET_VARIANTS) {
    setForm((prev) => ({ ...prev, variants: PRESET_VARIANTS[preset].map((v) => ({ ...v })) }));
  }

  function openAddModal() {
    setEditId(null);
    setForm(emptyDish());
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  }

  function startEdit(dish: Dish) {
    setEditId(dish._id);
    setForm({ 
      name: dish.name, 
      department: dish.department,
      imageUrl: dish.imageUrl || '',
      variants: dish.variants.map((v) => ({ ...v, price: String(v.price) })) 
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditId(null);
    setForm(emptyDish());
    setError('');
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/upload`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      
      if (data.secure_url) {
        setForm(prev => ({ ...prev, imageUrl: data.secure_url }));
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error(err);
      setError('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const variants = form.variants.map((v) => ({ label: v.label.trim(), price: Number(v.price) }));
    if (!form.name.trim() || !form.department) { setError('Name and department are required.'); return; }
    if (variants.some((v) => !v.label || isNaN(v.price) || v.price < 0)) { setError('All variant labels and prices are required.'); return; }

    startTransition(async () => {
      const url = editId ? `/api/dishes/${editId}` : '/api/dishes';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: form.name.trim(), 
          department: form.department,
          imageUrl: form.imageUrl?.trim() || undefined,
          variants 
        }),
      });
      if (res.ok) {
        setSuccess(editId ? 'Dish updated!' : 'Dish added!');
        fetchDishes();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to save dish.');
      }
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/dishes/${id}`, { method: 'DELETE' });
    if (res.ok) { setSuccess('Dish deleted.'); fetchDishes(); }
    else setError('Failed to delete dish.');
  }

  const restaurantDishes = dishes.filter(d => d.department === 'Restaurant');
  const bakeryDishes = dishes.filter(d => d.department === 'Bakery');

  const DishListSection = ({ title, items }: { title: string, items: Dish[] }) => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="font-semibold text-slate-800">{title} ({items.length})</h2>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-sm">No items in this section.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((dish) => (
            <div key={dish._id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition">
              {dish.imageUrl ? (
                <img src={dish.imageUrl} alt={dish.name} className="w-12 h-12 rounded-xl object-cover bg-slate-100 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-400 text-xs font-medium">None</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{dish.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {dish.variants.map((v) => (
                    <span key={v.label} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">
                      {v.label}: ₹{v.price}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                <button onClick={() => startEdit(dish)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition">
                  Edit
                </button>
                <button onClick={() => handleDelete(dish._id, dish.name)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-red-100 text-xs text-red-500 hover:bg-red-50 transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Menu</h1>
          <p className="text-sm text-slate-500 mt-1">Organize your Restaurant and Bakery offerings.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {success && <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-100">{success}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <DishListSection title="Restaurant Menu" items={restaurantDishes} />
          <DishListSection title="Bakery Menu" items={bakeryDishes} />
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">{editId ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
              <button onClick={closeModal} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <label className="block text-sm font-semibold text-slate-800 mb-3">Department</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="department" value="Restaurant" checked={form.department === 'Restaurant'} 
                      onChange={() => setForm(p => ({ ...p, department: 'Restaurant' }))} 
                      className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition">Restaurant</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="department" value="Bakery" checked={form.department === 'Bakery'} 
                      onChange={() => setForm(p => ({ ...p, department: 'Bakery' }))}
                      className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition">Bakery</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Item Name</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Chicken Biriyani / Chocolate Cake" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Item Image</label>
                <div className="flex items-end gap-4">
                  {form.imageUrl ? (
                    <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 group">
                      <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setForm(p => ({ ...p, imageUrl: '' }))}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-24 h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center flex-shrink-0 hover:border-amber-400 hover:bg-amber-50 transition cursor-pointer">
                      {uploadingImage ? (
                        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-[10px] text-slate-500 font-medium">Upload</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1.5">Or provide a direct image URL:</p>
                    <div className="flex gap-2">
                      <input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                      />
                      <button 
                        type="button" 
                        disabled={uploadingImage || !form.imageUrl || form.imageUrl.includes('cloudinary.com')}
                        onClick={async () => {
                          setUploadingImage(true);
                          setError('');
                          try {
                            const res = await fetch('/api/upload/url', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ url: form.imageUrl }),
                            });
                            const data = await res.json();
                            if (data.secure_url) {
                              setForm(p => ({ ...p, imageUrl: data.secure_url }));
                            } else {
                              setError(data.error || 'Failed to fetch and upload image from URL');
                            }
                          } catch (err) {
                            setError('Error uploading image URL');
                          } finally {
                            setUploadingImage(false);
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition disabled:opacity-50"
                      >
                        Upload to Cloudinary
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Variants & Pricing</label>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {(Object.keys(PRESET_VARIANTS) as Array<keyof typeof PRESET_VARIANTS>).map((p) => (
                      <button key={p} type="button" onClick={() => applyPreset(p)}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-600 font-medium transition">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {form.variants.map((v, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <input value={v.label} onChange={(e) => handleVariantChange(idx, 'label', e.target.value)}
                        placeholder="Label (e.g. Full)"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                      />
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-slate-400 text-sm font-medium">₹</span>
                        <input type="number" min="0" step="0.01" value={v.price} onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                          placeholder="Price"
                          className="w-32 pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                        />
                      </div>
                      {form.variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(idx)}
                          className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition flex-shrink-0 border border-slate-200 hover:border-red-200">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addVariant}
                  className="mt-3 flex items-center justify-center w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 font-medium transition">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Variant
                </button>
              </div>

              {error && <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || uploadingImage}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 focus:ring-4 focus:ring-amber-500/20 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editId ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
