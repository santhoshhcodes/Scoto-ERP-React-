import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Subtle enterprise background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      
      {/* Subtle brand glow in the background */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[460px]">
          <Outlet />
        </div>
      </main>

      {/* Enterprise Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">SCOTO SYSTEC PRIVATE LIMITED</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="text-slate-500">Enterprise Operations & Biometric Attendance Gateway</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary-700 font-medium">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            <span>256-Bit SSL Enterprise Secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;

