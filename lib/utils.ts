import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formats a rupee amount without a trailing ".00" for whole numbers
// (e.g. 100 -> "100", 99.5 -> "99.50") — bills rarely carry paise, so
// forcing two decimals everywhere just clutters the receipt.
export function formatMoney(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}
