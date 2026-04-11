"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useEffect, ReactNode } from "react";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Users,
  ShoppingCart,
  Package,
  History,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<{ department: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((u) => {
        setUser(u);
        const isAdminPage = pathname.startsWith("/admin/");
        const isOpsPage = pathname === "/checkout" || pathname === "/menu";

        if (u.department === "Admin" && isOpsPage) {
          router.replace("/admin/dashboard");
        } else if (u.department !== "Admin" && isAdminPage) {
          router.replace("/checkout");
        }
      })
      .catch(() => { });
  }, [pathname, router]);

  const handleLogout = () => {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    });
  };

  const navLinks =
    user?.department === "Admin"
      ? [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/bill-history", label: "Bills", icon: Receipt },
        { href: "/admin/expenses", label: "Expenses", icon: Wallet },
        { href: "/admin/salaries", label: "Salaries", icon: Users },
      ]
      : [
        { href: "/checkout", label: "Checkout", icon: ShoppingCart },
        { href: "/menu", label: "Menu", icon: Package },
        { href: "/bill-history", label: "History", icon: History },
      ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col print:bg-white print:block pb-20 md:pb-0 overflow-hidden">
      {/* Top Navbar */}
      <header className="print:hidden bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-base tracking-tight">
              Zapbill
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition flex items-center gap-2",
                  pathname === link.href
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 transition px-3 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto print:block">{children}</main>

      {/* Bottom Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 px-2 py-3 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
        <nav className="flex items-center justify-around">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-3 py-1 rounded-lg transition-all duration-300",
                  isActive ? "text-amber-600 scale-110" : "text-slate-400",
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive ? "bg-amber-100" : "bg-transparent",
                  )}
                >
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
