import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Scissors,
  Users,
  BarChart3,
  ExternalLink,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform duration-200">
                  <Sparkles className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                      BookingAdmin
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-indigo-600" />
                      Pro
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                    Hệ thống Điều phối & Quản trị Lịch biểu
                  </p>
                </div>
              </Link>

              {/* Navigation Menu */}
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/80 transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  Lịch biểu (Grid)
                </Link>
                <Link
                  href="/admin/services"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                >
                  <Scissors className="w-4 h-4 text-slate-500" />
                  Dịch vụ
                </Link>
                <Link
                  href="/admin/staff"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  Nhân sự & Ca
                </Link>
                <Link
                  href="/admin/stats"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  Thống kê
                </Link>
              </nav>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 bg-white transition-all shadow-xs"
              >
                <span>Giao diện Đặt lịch</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
