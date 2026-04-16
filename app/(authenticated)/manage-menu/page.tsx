"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  ImagePlus,
  Loader2,
  Plus,
  Utensils,
  Croissant,
  Search,
  Check,
  Trash2,
  Pencil,
  LayoutDashboard,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

interface Variant {
  label: string;
  price: number | string;
}
interface Dish {
  _id: string;
  name: string;
  department: "Restaurant" | "Bakery" | "Both";
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  variants: Variant[];
}
interface CategoryData {
  _id: string;
  name: string;
  department: "Restaurant" | "Bakery" | "Both";
  isCommon: boolean;
  commonRequested: boolean;
  requestedBy: string | null;
}

const PRESET_VARIANTS = {
  "Quarter/Half/Full": [
    { label: "Quarter", price: "" },
    { label: "Half", price: "" },
    { label: "Full", price: "" },
  ],
  "Per Piece": [{ label: "Per Piece", price: "" }],
  "Weight (KG)": [{ label: "Per KG", price: "" }],
  Custom: [{ label: "", price: "" }],
};

function emptyDish() {
  return {
    name: "",
    department: "Restaurant" as "Restaurant" | "Bakery" | "Both",
    category: "Common",
    imageUrl: "",
    variants: [
      { label: "Quarter", price: "" },
      { label: "Half", price: "" },
      { label: "Full", price: "" },
    ] as Variant[],
  };
}

export default function AdminPage() {
  const [user, setUser] = useState<{
    username: string;
    department: "Restaurant" | "Bakery" | "Both";
  } | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState(emptyDish());
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isCategoryManagementOpen, setIsCategoryManagementOpen] = useState(false);
  const [activeCatTab, setActiveCatTab] = useState<'mine' | 'explore'>('mine');

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      const res = await fetch(`/api/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: catId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Category deleted");
        setCategories((prev) => prev.filter((c) => c._id !== catId));
      } else {
        toast.error(data.error || "Failed to delete category");
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
      toast.error("Error deleting category");
    }
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Category updated");
        setEditingCatId(null);
        fetchCategories();
        fetchDishes(); // Important: Dishes might have been renamed
      } else {
        toast.error(data.error || "Failed to update category");
      }
    } catch (err) {
      toast.error("Error updating category");
    }
  };

  const handleAddCategoryFromModal = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        toast.success("Category added");
        setNewCategoryName("");
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add category");
      }
    } catch (err) {
      toast.error("Error adding category");
    }
  };

  const fetchDishes = async () => {
    setLoading(true);
    const res = await fetch("/api/dishes");
    const data = await res.json();
    setDishes(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((u) => {
        if (u.department) {
          setUser(u);
          setForm((prev) => ({ ...prev, department: u.department }));
        }
      });
    fetchDishes();
    fetchCategories();
  }, [user?.department]); // Refetch when department changes

  function handleVariantChange(
    idx: number,
    field: "label" | "price",
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === idx ? { ...v, [field]: value } : v,
      ),
    }));
  }

  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { label: "", price: "" }],
    }));
  }

  function removeVariant(idx: number) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  }

  function applyPreset(preset: keyof typeof PRESET_VARIANTS) {
    setForm((prev) => ({
      ...prev,
      variants: PRESET_VARIANTS[preset].map((v) => ({ ...v })),
    }));
  }

  function openAddModal() {
    setEditId(null);
    setForm({ ...emptyDish(), department: user?.department ?? "Restaurant" });
    setError("");
    setIsModalOpen(true);
  }

  function startEdit(dish: Dish) {
    setEditId(dish._id);
    setForm({
      name: dish.name,
      department: dish.department,
      category: dish.category || "common",
      imageUrl: dish.imageUrl || "",
      variants: dish.variants.map((v) => ({ ...v, price: String(v.price) })),
    });
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditId(null);
    setForm(emptyDish());
    setError("");
    setCategorySearch("");
    setIsAddingCategory(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.secure_url) {
        setForm((prev) => ({ ...prev, imageUrl: data.secure_url }));
      } else {
        setError(data.error || "Failed to upload image");
      }
    } catch (err) {
      console.error(err);
      setError("Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const variants = form.variants.map((v) => ({
      label: v.label.trim(),
      price: Number(v.price),
    }));
    if (!form.name.trim() || !form.department) {
      setError("Name and department are required.");
      return;
    }
    if (variants.some((v) => !v.label || isNaN(v.price) || v.price <= 0)) {
      setError("All variant labels and prices greater than 0 are required.");
      return;
    }

    startTransition(async () => {
      const url = editId ? `/api/dishes/${editId}` : "/api/dishes";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          department: form.department,
          category: form.category.trim() || "common",
          imageUrl: form.imageUrl?.trim() || undefined,
          variants,
        }),
      });
      if (res.ok) {
        toast.success(editId ? "Dish updated!" : "Dish added!");
        fetchDishes();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to save dish.");
      }
    });
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    const res = await fetch(`/api/dishes/${itemToDelete.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Dish deleted.");
      fetchDishes();
      setItemToDelete(null);
    } else {
      setError("Failed to delete dish.");
      setItemToDelete(null);
    }
  }

  async function toggleAvailability(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/dishes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !current }),
      });
      if (res.ok) {
        setDishes((prev) =>
          prev.map((d) => (d._id === id ? { ...d, isAvailable: !current } : d)),
        );
        toast.success(!current ? "Enabled in customer menu" : "Disabled in customer menu");
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  }

  const filteredDishes = dishes.filter((d) => {
    const dishCat = (d.category || "Common").trim().toLowerCase();
    const isDeptMatch = !user || d.department === user.department || d.department === "Both";
    // If the category is in our visible categories list, the dish is visible
    const isCategoryVisible = categories.some(
      (c) => (c.department === user?.department || c.department === "Both") && c.name.trim().toLowerCase() === dishCat
    );
    return (isDeptMatch || isCategoryVisible) && d.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const DishListSection = ({ items, allCategories }: { items: Dish[], allCategories: CategoryData[] }) => {
    const combinedCategories = Array.from(
      new Set([
        ...allCategories
          .filter(c => c.department === user?.department || c.department === 'Both')
          .map(c => c.name),
        ...items.map(i => i.category || "Common")
      ])
    ).sort();

    const displayItems = activeCategoryFilter === "All"
      ? items
      : items.filter((i) => {
        const itemCat = (i.category || "Common").trim().toLowerCase();
        const filterCat = activeCategoryFilter.trim().toLowerCase();
        return itemCat === filterCat;
      });

    return (
      <div className="space-y-6 w-full">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter("All")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryFilter === "All"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
          >
            All Items
          </button>
          {combinedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategoryFilter === cat
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {displayItems.length === 0 ? (
          <div className="p-12 text-center rounded-lg bg-white border border-slate-200 border-dashed flex flex-col items-center justify-center gap-3">
            <p className="text-slate-500 text-sm font-medium">
              No items found in this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayItems.map((dish) => (
              <div
                key={dish._id}
                className="group bg-white rounded-lg border border-slate-200 p-5 hover:border-amber-200 transition-all duration-300 flex flex-col gap-5 shadow-sm hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {dish.imageUrl ? (
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-16 h-16 rounded-lg object-cover bg-slate-50 shrink-0 shadow-sm border border-slate-100"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                        No Img
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3
                      className="font-semibold text-slate-900 text-base leading-tight truncate"
                      title={dish.name}
                    >
                      {dish.name}
                    </h3>
                    <p className="text-[10px] tracking-widest text-slate-400">
                      {dish.category || "Common"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {dish.variants.map((v, idx) => (
                        <span
                          key={`${v.label}-${idx}`}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-bold"
                        >
                          {v.label}: ₹{v.price}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-auto border-t border-slate-50">
                  <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black text-slate-800 tracking-tight leading-none">Customer Menu</span>
                      <span className="text-[10px] font-bold text-slate-400 tracking-tighter">Public Visibility</span>
                    </div>
                    <Switch
                      checked={dish.isAvailable}
                      onCheckedChange={() => toggleAvailability(dish._id, dish.isAvailable)}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 h-9"
                      onClick={() => startEdit(dish)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      className="p-3 h-9"
                      onClick={() =>
                        setItemToDelete({ id: dish._id, name: dish.name })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-4 md:px-10 lg:px-20 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Manage Menu
          </h1>
          <p className="text-slate-500 text-sm">
            Organize and update your {user?.department} menu.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[300px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-lg"
            />
          </div>
          {user?.department && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setIsCategoryManagementOpen(true)}
                className="h-10 rounded-lg px-4 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <Utensils className="w-4 h-4" />
                Manage Category
              </Button>
              {categories.filter(c => c.commonRequested && c.requestedBy !== user.department).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in-50 duration-300">
                  {categories.filter(c => c.commonRequested && c.requestedBy !== user.department).length}
                </span>
              )}
            </div>
          )}
          <Button
            onClick={openAddModal}
            className="h-10 rounded-lg px-6 font-bold bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="w-5 h-5 mr-1" />
            Add Item
          </Button>
        </div>
      </div>



      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-slate-500 font-medium">Loading your menu...</p>
        </div>
      ) : (
        <div className="animate-in w-full fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6 px-1">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {user?.department === "Bakery" ? (
                <Croissant className="w-5 h-5 text-amber-600" />
              ) : (
                <Utensils className="w-5 h-5 text-amber-600" />
              )}
              {user?.department ?? "Menu"}
            </h2>
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md tracking-tight">
              {filteredDishes.length}{" "} Items
            </span>
          </div>
          <DishListSection items={filteredDishes} allCategories={categories} />
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] lg:max-w-[50vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
            <DialogTitle className="text-lg font-bold text-slate-800">
              {editId ? "Edit Menu Item" : "Add New Menu Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <form
              id="dish-form"
              onSubmit={handleSubmit}
              className="p-6 space-y-6"
            >
              {!user?.department && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-3">
                  <Label className="text-sm font-semibold text-slate-800">
                    Department
                  </Label>
                  <RadioGroup
                    value={form.department}
                    onValueChange={(v: string) =>
                      setForm((p) => ({
                        ...p,
                        department: v as "Restaurant" | "Bakery",
                      }))
                    }
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2 cursor-pointer group">
                      <RadioGroupItem value="Restaurant" id="restaurant" />
                      <Label
                        htmlFor="restaurant"
                        className="cursor-pointer font-medium text-slate-700 group-hover:text-slate-900 transition"
                      >
                        Restaurant
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer group">
                      <RadioGroupItem value="Bakery" id="bakery" />
                      <Label
                        htmlFor="bakery"
                        className="cursor-pointer font-medium text-slate-700 group-hover:text-slate-900 transition"
                      >
                        Bakery
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="item-name"
                    className="font-bold text-slate-700"
                  >
                    Item Name
                  </Label>
                  <Input
                    id="item-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Item Name"
                    required
                    className="h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="category"
                      className="font-bold text-slate-700"
                    >
                      Category
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(!isAddingCategory);
                        setCategorySearch("");
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 transition flex items-center gap-1 rounded-full"
                    >
                      {isAddingCategory ? (
                        <>Selection Mode</>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> New
                        </>
                      )}
                    </button>
                  </div>

                  {isAddingCategory ? (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="relative flex-1">
                        <Input
                          value={form.category}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, category: e.target.value }))
                          }
                          placeholder="Type new category name..."
                          className="h-11 rounded-lg border-amber-200 focus:border-amber-400 focus:ring-amber-500/10"
                          autoFocus
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        onClick={async () => {
                          if (!form.category.trim()) return;
                          try {
                            const res = await fetch("/api/categories", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: form.category.trim(),
                              }),
                            });
                            const newCat = await res.json();
                            if (res.ok) {
                              setCategories((prev) => {
                                if (prev.includes(newCat.name)) return prev;
                                return [...prev, newCat.name].sort((a, b) =>
                                  a.localeCompare(b),
                                );
                              });
                            }
                            setIsAddingCategory(false);
                          } catch (err) {
                            console.error("Failed to save category:", err);
                          }
                        }}
                        className="h-11 w-11 rounded-lg bg-amber-500 hover:bg-amber-600 shadow-sm"
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setForm((p) => ({ ...p, category: "" }));
                        }}
                        className="h-11 w-11 rounded-lg border-slate-200 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Combobox
                      items={categories.filter((cat) =>
                        cat.name
                          .toLowerCase()
                          .includes(categorySearch.toLowerCase()),
                      )}
                      value={form.category}
                      onValueChange={(v: string | null) => {
                        setForm((p) => ({ ...p, category: v || "" }));
                        setCategorySearch(""); // reset search
                      }}
                      onInputValueChange={(v: string) => setCategorySearch(v)}
                    >
                      <ComboboxInput
                        placeholder="select category"
                        className="h-10"
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: CategoryData) => (
                            <ComboboxItem
                              key={item._id}
                              value={item.name}
                              className="flex justify-between items-center group w-full"
                            >
                              <span className="truncate">{item.name}</span>
                              <button
                                type="button"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteCategory(item._id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1 rounded-md hover:bg-red-50 shrink-0"
                                title="Delete category"
                              >
                                <Trash2 className="w-4 h-4 cursor-pointer" />
                              </button>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                </div>
              </div>

              {/* Image Upload Area */}
              <div className="space-y-2">
                <Label className="font-medium text-slate-700">Item Image</Label>
                <div className="flex items-end gap-4">
                  {form.imageUrl ? (
                    <div className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden shrink-0 group">
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-24 h-24 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center shrink-0 hover:border-amber-400 hover:bg-amber-50 transition cursor-pointer">
                      {uploadingImage ? (
                        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-[10px] text-slate-500 font-medium">
                            Upload
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs text-slate-500">
                      Or provide a direct image URL:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={form.imageUrl}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, imageUrl: e.target.value }))
                        }
                        placeholder="https://example.com/image.jpg"
                        className="h-10 rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="default"
                        className="h-10 rounded-lg whitespace-nowrap"
                        disabled={
                          uploadingImage ||
                          !form.imageUrl ||
                          form.imageUrl.includes("cloudinary.com")
                        }
                        onClick={async () => {
                          setUploadingImage(true);
                          setError("");
                          try {
                            const res = await fetch("/api/upload/url", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ url: form.imageUrl }),
                            });
                            const data = await res.json();
                            if (data.secure_url) {
                              setForm((p) => ({
                                ...p,
                                imageUrl: data.secure_url,
                              }));
                            } else {
                              setError(
                                data.error ||
                                "Failed to fetch and upload image from URL",
                              );
                            }
                          } catch (err) {
                            setError("Error uploading image URL");
                          } finally {
                            setUploadingImage(false);
                          }
                        }}
                      >
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-slate-700">
                    Variants & Pricing
                  </Label>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {(
                      Object.keys(PRESET_VARIANTS) as Array<
                        keyof typeof PRESET_VARIANTS
                      >
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-600 font-medium transition"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {form.variants.map((v, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <Input
                        value={v.label}
                        onChange={(e) =>
                          handleVariantChange(idx, "label", e.target.value)
                        }
                        placeholder="Label (e.g. Full)"
                        className="h-10 rounded-lg flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.price}
                          onChange={(e) =>
                            handleVariantChange(idx, "price", e.target.value)
                          }
                          placeholder="0.00"
                          className="h-10 rounded-lg pl-8"
                        />
                      </div>
                      {form.variants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(idx)}
                          className="h-10 w-10 text-slate-400 hover:text-red-500 transition shrink-0 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 border-dashed border-2 rounded-lg text-slate-500 hover:text-amber-600 hover:border-amber-200"
                  onClick={addVariant}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Variant
                </Button>
              </div>

              {error && (
                <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
                  {error}
                </p>
              )}
            </form>
          </div>

          <DialogFooter className="mb-1 mr-3 border-t border-slate-100 shrink-0 flex gap-3 sm:justify-end bg-slate-50/50">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="px-6 h-10 rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="dish-form"
              disabled={isPending || uploadingImage}
              className="px-6 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editId ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              item <span className="font-bold text-slate-900">"{itemToDelete?.name}"</span> from your menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Category Management Modal */}
      <Dialog open={isCategoryManagementOpen} onOpenChange={setIsCategoryManagementOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-lg border-none shadow-2xl bg-white">
          <DialogHeader className="p-6 pb-4 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                  <Utensils className="w-5 h-5" />
                </div>
                Categories
              </DialogTitle>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 mt-6 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveCatTab('mine')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeCatTab === 'mine'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Our Categories
              </button>
              <button
                onClick={() => setActiveCatTab('explore')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeCatTab === 'explore'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Search className="w-3.5 h-3.5" />
                Explore {user?.department === 'Restaurant' ? 'Bakery' : 'Restaurant'}
              </button>
            </div>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {activeCatTab === 'mine' ? (
              <div className="p-6 space-y-8">
                {/* Incoming Requests Section */}
                {categories.filter(c => c.commonRequested && c.requestedBy !== user?.department).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 px-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Approval Requests
                    </h3>
                    <div className="grid gap-2.5">
                      {categories.filter(c => c.commonRequested && c.requestedBy !== user?.department).map(cat => (
                        <div key={cat._id} className="bg-red-50/40 border border-red-100 rounded-lg p-4 flex items-center justify-between group transition-all hover:bg-red-50">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{cat.name}</p>
                            <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight mt-0.5">Requested by {cat.requestedBy}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={async () => {
                                const res = await fetch('/api/categories/resolve', {
                                  method: 'POST',
                                  body: JSON.stringify({ id: cat._id, action: 'accept' })
                                });
                                if (res.ok) {
                                  toast.success(`"${cat.name}" is now common!`);
                                  fetchCategories();
                                }
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-4 rounded-lg font-bold text-[11px] shadow-sm shadow-emerald-500/10"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const res = await fetch('/api/categories/resolve', {
                                  method: 'POST',
                                  body: JSON.stringify({ id: cat._id, action: 'reject' })
                                });
                                if (res.ok) {
                                  toast.error(`Request for "${cat.name}" rejected`);
                                  fetchCategories();
                                }
                              }}
                              className="text-slate-500 hover:text-red-600 hover:bg-red-50 h-8 px-4 rounded-lg font-bold text-[11px]"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Category Form */}
                <div className="bg-slate-50/80 border border-slate-100 rounded-lg p-5 space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Add Local Category
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Category name (e.g. Burgers)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategoryFromModal()}
                      className="bg-white border-slate-200 h-11 rounded-lg text-sm font-medium focus:ring-amber-500 shadow-sm"
                    />
                    <Button
                      onClick={handleAddCategoryFromModal}
                      className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6 rounded-lg font-bold shadow-lg shadow-slate-900/10"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                </div>

                {/* My Categories List */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Your Active Categories
                  </h3>
                  <div className="grid gap-3">
                    {categories
                      .filter(c => c.department === user?.department || c.department === 'Both')
                      .sort((a, b) => (a.isCommon === b.isCommon ? -1 : 1))
                      .map(cat => (
                        <div key={cat._id} className={`p-4 rounded-lg border transition-all duration-300 flex items-center justify-between ${cat.isCommon
                          ? 'bg-amber-50/50 border-amber-100/50 shadow-sm shadow-amber-500/5'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/50'
                          }`}>
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.isCommon ? 'bg-amber-500 shadow-sm shadow-amber-500/40' : 'bg-slate-200'}`} />

                            {editingCatId === cat._id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  autoFocus
                                  value={editingCatName}
                                  onChange={(e) => setEditingCatName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateCategory(cat._id, editingCatName);
                                    if (e.key === 'Escape') setEditingCatId(null);
                                  }}
                                  className="h-9 py-0 px-3 text-sm bg-white border-amber-200 focus:ring-amber-500 rounded-lg"
                                />
                                <div className="flex gap-1">
                                  <Button size="icon" className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={() => handleUpdateCategory(cat._id, editingCatName)}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg" onClick={() => setEditingCatId(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate text-sm">{cat.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {cat.isCommon ? (
                                    <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm shadow-amber-500/5">Common</span>
                                  ) : cat.commonRequested ? (
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      {cat.requestedBy === user?.department ? "Waiting for Approval" : "Request Pending"}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Private</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {editingCatId !== cat._id && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCatId(cat._id);
                                  setEditingCatName(cat.name);
                                }}
                                className="h-9 w-9 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteCategory(cat._id)}
                                className="h-9 w-9 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-8">
                {/* Explore Categories Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      Available to Request
                    </h3>
                    <span className="text-[10px] font-bold text-slate-300">
                      {categories.filter(c => c.department !== user?.department && c.department !== 'Both' && !c.isCommon).length} found
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {categories
                      .filter(c => c.department !== user?.department && c.department !== 'Both' && !c.isCommon)
                      .map(cat => (
                        <div key={cat._id} className="p-4 rounded-lg border border-slate-100 bg-white hover:border-amber-200 transition-all group hover:shadow-lg hover:shadow-slate-200/40">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate text-sm">{cat.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  Belongs to {cat.department}
                                </span>
                                {cat.commonRequested && (
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${cat.requestedBy === user?.department ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'
                                    }`}>
                                    {cat.requestedBy === user?.department ? 'Sent Request' : 'Under Review'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {!cat.commonRequested && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const res = await fetch('/api/categories/request', {
                                    method: 'POST',
                                    body: JSON.stringify({ id: cat._id })
                                  });
                                  if (res.ok) {
                                    toast.info(`Request sent to share "${cat.name}"`);
                                    fetchCategories();
                                  }
                                }}
                                className="h-9 px-4 rounded-lg font-bold text-[11px] border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 shadow-sm transition-all"
                              >
                                Request to Share
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                    {categories.filter(c => c.department !== user?.department && c.department !== 'Both' && !c.isCommon).length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                          <Search className="w-6 h-6 text-slate-200" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">No new categories to explore</h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                          All categories from the {user?.department === 'Restaurant' ? 'Bakery' : 'Restaurant'} section are already shared or linked.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
            <Button
              onClick={() => setIsCategoryManagementOpen(false)}
              className="w-full h-12 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
