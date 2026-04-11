import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Animated Icon Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-amber-200 blur-3xl opacity-20 rounded-full scale-150" />
          <h1 className="relative text-[120px] font-black text-slate-200 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center rotate-12 group hover:rotate-0 transition-transform duration-500">
               <span className="text-4xl">🔎</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
          <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link 
            href="/" 
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-white flex items-center justify-center gap-2"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Link>
          <Link 
            href="/checkout" 
            className={cn(
              buttonVariants({ variant: "default" }),
              "flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            )}
          >
            <Home className="w-4 h-4" />
            Checkout
          </Link>
        </div>

        <p className="text-[10px] text-slate-400 uppercase tracking-widest pt-8 font-medium">
          ZapBill - Billing System
        </p>
      </div>
    </div>
  );
}
