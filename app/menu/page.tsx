"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Utensils, Info, X, Eye, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Variant {
  label: string;
  price: number;
}

interface Dish {
  _id: string;
  name: string;
  category: string;
  imageUrl?: string;
  variants: Variant[];
  department: string;
}

export default function PublicMenuPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

  useEffect(() => {
    // 1. Navigation Lockdown
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    // 2. Kiosk Cookie
    document.cookie = "kiosk_mode=true; path=/; max-age=3600";

    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/dishes/public");
        const data = await res.json();
        setDishes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch menu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(dishes.map((d) => d.category || "General"));
    return ["All", ...Array.from(cats).sort()];
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || d.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [dishes, searchQuery, activeCategory]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium text-sm text-center tracking-widest">Loading Digital Menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-amber-100 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight leading-tight uppercase">ZAPBILL</h1>
            </div>
          </div>
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md">Digital Menu</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="space-y-4">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500" />
            <Input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 pr-4 rounded-lg border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all text-sm border-none shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                  activeCategory === cat
                    ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "bg-white border-slate-200 text-slate-500"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 2 Items per row Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {filteredDishes.map((dish) => (
            <div
              key={dish._id}
              onClick={() => setSelectedDish(dish)}
              className="group relative flex flex-col bg-white rounded-lg overflow-hidden border border-slate-100 active:scale-95 transition-all duration-200 shadow-sm"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-50">
                {dish.imageUrl ? (
                  <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Utensils className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="p-3 pb-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-[0.15em] mb-0.5">{dish.category}</p>
                  <h3 className="text-sm font-black text-slate-900 leading-tight line-clamp-2">{dish.name}</h3>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <p className="text-sm font-black text-slate-900">
                    ₹{dish.variants[0]?.price}
                  </p>
                  <button className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDishes.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No results found</p>
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDish} onOpenChange={() => setSelectedDish(null)}>
        <DialogContent showCloseButton={false} className="max-w-[90vw] w-[400px] max-h-[90vh] p-0 rounded-lg overflow-hidden border-none shadow-2xl flex flex-col">
          {selectedDish && (
            <div className="flex flex-col overflow-y-auto custom-scrollbar">
              <div className="relative aspect-4/3 bg-slate-100">
                {selectedDish.imageUrl ? (
                  <img src={selectedDish.imageUrl} alt={selectedDish.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Utensils className="w-16 h-16" />
                  </div>
                )}
                <button
                  onClick={() => setSelectedDish(null)}
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-800 transition-all hover:bg-white active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-[9px] font-black text-amber-700 uppercase tracking-widest">
                      {selectedDish.category}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">• {selectedDish.department}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedDish.name}</h2>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pricing Options</p>
                  <div className="grid gap-3">
                    {selectedDish.variants.map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:border-amber-200">
                        <span className="text-sm font-bold text-slate-600">
                          {v.label.toLowerCase() === 'per piece' ? 'Price' : v.label}
                        </span>
                        <span className="text-lg font-black text-slate-900">₹{v.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDish(null)}
                  className="w-full py-4 bg-amber-500 rounded-lg text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-[0.98] transition-all"
                >
                  Close Details
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
