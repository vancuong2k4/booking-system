"use client";

import React from "react";
import { format, addDays, subDays, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCw,
  Filter,
  UserCheck,
} from "lucide-react";
import { Staff } from "@prisma/client";

interface CalendarHeaderProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  staffList: Staff[];
  selectedStaffId: string | null;
  onSelectStaffId: (staffId: string | null) => void;
  selectedStatus: string | null;
  onSelectStatus: (status: string | null) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const STATUS_OPTIONS = [
  { value: null, label: "Tất cả trạng thái" },
  { value: "CONFIRMED", label: "Đã xác nhận", dot: "bg-emerald-500" },
  { value: "CHECKED_IN", label: "Đang phục vụ", dot: "bg-sky-500" },
  { value: "PENDING", label: "Chờ duyệt", dot: "bg-amber-500" },
  { value: "COMPLETED", label: "Hoàn thành", dot: "bg-slate-500" },
  { value: "CANCELLED", label: "Đã hủy", dot: "bg-rose-500" },
  { value: "NO_SHOW", label: "Vắng mặt", dot: "bg-orange-500" },
];

export default function CalendarHeader({
  selectedDate,
  onSelectDate,
  staffList,
  selectedStaffId,
  onSelectStaffId,
  selectedStatus,
  onSelectStatus,
  onRefresh,
  isLoading,
}: CalendarHeaderProps) {
  const isSelectedDateToday = isToday(selectedDate);

  const formattedDateTitle = format(
    selectedDate,
    "EEEE, 'ngày' dd 'tháng' MM, yyyy",
    { locale: vi }
  ).replace(/^./, (c) => c.toUpperCase());

  const handlePrevDay = () => onSelectDate(subDays(selectedDate, 1));
  const handleNextDay = () => onSelectDate(addDays(selectedDate, 1));
  const handleToday = () => onSelectDate(new Date());

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split("-").map(Number);
    onSelectDate(new Date(y, m - 1, d));
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Date controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Quick Date Stepper */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-xs">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Ngày trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                isSelectedDateToday
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Ngày tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative">
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={handleDateInputChange}
              className="text-xs font-semibold px-3 py-2 pl-8 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer shadow-xs"
            />
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date textual label */}
          <div className="pl-1">
            <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              {formattedDateTitle}
            </h2>
          </div>
        </div>

        {/* Right: Filters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by Staff */}
          <div className="relative">
            <select
              value={selectedStaffId || ""}
              onChange={(e) => onSelectStaffId(e.target.value || null)}
              className="text-xs font-semibold pl-8 pr-7 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer appearance-none shadow-xs"
            >
              <option value="">Tất cả nhân viên ({staffList.length})</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.role})
                </option>
              ))}
            </select>
            <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter by Status */}
          <div className="relative">
            <select
              value={selectedStatus || ""}
              onChange={(e) => onSelectStatus(e.target.value || null)}
              className="text-xs font-semibold pl-8 pr-7 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer appearance-none shadow-xs"
            >
              {STATUS_OPTIONS.map((opt, i) => (
                <option key={i} value={opt.value || ""}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-xs disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RotateCw
              className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
