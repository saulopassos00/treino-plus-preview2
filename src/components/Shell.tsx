"use client";

import { BottomNav } from "./BottomNav";
import { ToastProvider } from "./Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-[#F2F2F7] text-neutral-900 sm:bg-gradient-to-b sm:from-neutral-200 sm:via-neutral-100 sm:to-neutral-300 sm:py-6">
        <div className="mx-auto min-h-dvh max-w-[430px] bg-[#F2F2F7] pb-24 shadow-[0_0_80px_rgba(0,0,0,0.04)] sm:min-h-[850px] sm:rounded-[40px] sm:shadow-[0_24px_70px_rgba(0,0,0,0.16)] sm:ring-1 sm:ring-black/[0.08] sm:overflow-hidden relative">
          {/* Mockup do topo de tela no desktop */}
          <div className="hidden sm:flex items-center justify-between px-7 pt-3 pb-1 select-none text-[11px] font-semibold text-neutral-800">
            <span>9:41</span>
            <div className="h-4 w-24 rounded-full bg-neutral-950"></div>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="h-2.5 w-5 rounded-sm border border-neutral-800 p-0.5 flex items-center">
                <div className="h-full w-full bg-neutral-800 rounded-[1px]"></div>
              </div>
            </div>
          </div>
          {children}
        </div>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
