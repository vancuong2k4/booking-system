"use client";

import React from "react";
import {
  CalendarCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { formatVND } from "@/lib/utils";

export interface BookingSummaryStats {
  totalBookings: number;
  pendingCount: number;
  confirmedCount: number;
  checkedInCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  totalRevenue: number;
  expectedRevenue: number;
}

interface CalendarMetricsProps {
  summary: BookingSummaryStats | null;
  isLoading?: boolean;
}

export default function CalendarMetrics({
  summary,
  isLoading = false,
}: CalendarMetricsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs animate-pulse"
          >
            <div className="h-3 w-16 bg-slate-200 rounded-md mb-2" />
            <div className="h-6 w-12 bg-slate-200 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Tổng lịch hẹn",
      value: summary.totalBookings,
      subtitle: `${summary.pendingCount} chờ duyệt`,
      icon: CalendarCheck,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      title: "Đã xác nhận",
      value: summary.confirmedCount,
      subtitle: "Sẵn sàng đón khách",
      icon: Clock,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Đang phục vụ",
      value: summary.checkedInCount,
      subtitle: "Khách đang tại quầy",
      icon: Sparkles,
      color: "text-sky-600 bg-sky-50 border-sky-100",
    },
    {
      title: "Đã hoàn thành",
      value: summary.completedCount,
      subtitle: "Đã tính doanh thu",
      icon: CheckCircle2,
      color: "text-slate-700 bg-slate-100 border-slate-200",
    },
    {
      title: "Doanh thu thực",
      value: formatVND(summary.totalRevenue),
      subtitle: `Dự kiến: ${formatVND(summary.expectedRevenue)}`,
      icon: DollarSign,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      isMoney: true,
    },
    {
      title: "Hủy / Vắng mặt",
      value: summary.cancelledCount + summary.noShowCount,
      subtitle: `${summary.cancelledCount} hủy, ${summary.noShowCount} vắng`,
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center border ${card.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div
              className={`font-black text-slate-900 tracking-tight leading-none mb-1 ${
                card.isMoney ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
              }`}
            >
              {card.value}
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {card.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}
