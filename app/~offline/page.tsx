'use client';

import { WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-red-200 blur-2xl opacity-20 rounded-full animate-pulse" />
          <div className="relative w-24 h-24 bg-white rounded-lg shadow-xl flex items-center justify-center border border-slate-100">
            <WifiOff className="w-12 h-12 text-slate-400" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">You are Offline</h1>
          <p className="text-slate-500 text-sm leading-relaxed px-4">
            It looks like your internet connection is unavailable. Please check your network and try again.
          </p>
        </div>

        <div className="pt-4">
          <Button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Reconnecting
          </Button>
        </div>

        <div className="text-[10px] text-slate-400 uppercase tracking-widest pt-12">
          Offline Mode — ZapBill
        </div>
      </div>
    </div>
  );
}
