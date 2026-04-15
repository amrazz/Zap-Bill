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
} from "lucide-react";
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
  department: "Restaurant" | "Bakery";
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  variants: Variant[];
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
    department: "Restaurant" as "Restaurant" | "Bakery",
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
    department: "Restaurant" | "Bakery";
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
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data.map((c: any) => c.name) : []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName }),
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c !== catName));
        if (form.category === catName) {
          setForm((p) => ({ ...p, category: "" }));
        }
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
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

  const filteredDishes = dishes.filter(
    (d) =>
      (!user || d.department === user.department) &&
      d.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const DishListSection = ({ items }: { items: Dish[] }) => {
    const availableCategories = Array.from(
      new Set(items.map((i) => i.category || "common")),
    ).sort();

    const displayItems = activeCategoryFilter === "All"
      ? items
      : items.filter((i) => (i.category || "common") === activeCategoryFilter);

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
          {availableCategories.map((cat) => (
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
                      {dish.variants.map((v) => (
                        <span
                          key={v.label}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-bold"
                        >
                          {v.label}: ₹{v.price}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-slate-50">
                  <Button
                    variant="secondary"
                    className="p-3"
                    onClick={() => startEdit(dish)}
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="p-3"
                    onClick={() =>
                      setItemToDelete({ id: dish._id, name: dish.name })
                    }
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
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
          <DishListSection items={filteredDishes} />
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
                        cat
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
                          {(item: string) => (
                            <ComboboxItem
                              key={item}
                              value={item}
                              className="flex justify-between items-center group w-full"
                            >
                              <span className="truncate">{item}</span>
                              <button
                                type="button"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteCategory(item);
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
    </div>
  );
}
