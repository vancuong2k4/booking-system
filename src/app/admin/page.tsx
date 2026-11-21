"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Staff } from "@prisma/client";
import CalendarMetrics, {
  BookingSummaryStats,
} from "@/components/admin/CalendarMetrics";
import CalendarHeader from "@/components/admin/CalendarHeader";
import CalendarGrid, {
  AdminBookingWithRelations,
  StaffWithSchedules,
} from "@/components/admin/CalendarGrid";
import {
  AlertCircle,
  Calendar,
  X,
  Phone,
  User,
  Clock,
  Scissors,
  CheckCircle2,
} from "lucide-react";
import { formatVND, formatDuration } from "@/lib/utils";

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [staffList, setStaffList] = useState<StaffWithSchedules[]>([]);
  const [bookings, setBookings] = useState<AdminBookingWithRelations[]>([]);
  const [summary, setSummary] = useState<BookingSummaryStats | null>(null);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected booking for Quick Detail Drawer/Modal
  const [activeBooking, setActiveBooking] =
    useState<AdminBookingWithRelations | null>(null);

  // 1. Fetch Staff with Schedules
  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch("/api/admin/staff");
        const json = await res.json();
        if (json.success) {
          setStaffList(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch staff:", err);
      }
    }
    fetchStaff();
  }, []);

  // 2. Fetch Bookings for the selected date, staff and status
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const params = new URLSearchParams({ date: dateStr });

      if (selectedStaffId) params.append("staffId", selectedStaffId);
      if (selectedStatus) params.append("status", selectedStatus);

      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải danh sách lịch.");
      }

      setBookings(json.data || []);
      setSummary(json.summary || null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tải dữ liệu."
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedStaffId, selectedStatus]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter staff columns if a specific staff member is selected
  const visibleStaffList = selectedStaffId
    ? staffList.filter((s) => s.id === selectedStaffId)
    : staffList;

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Lịch biểu Theo ngày (Calendar Grid)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Theo dõi phân bổ ca làm việc, thời lượng dịch vụ và trạng thái khách
            hàng theo từng chuyên viên
          </p>
        </div>
      </div>

      {/* KPI Metrics Summary */}
      <CalendarMetrics summary={summary} isLoading={isLoading && !summary} />

      {/* Calendar Header with Controls & Filters */}
      <CalendarHeader
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        staffList={staffList}
        selectedStaffId={selectedStaffId}
        onSelectStaffId={setSelectedStaffId}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        onRefresh={fetchBookings}
        isLoading={isLoading}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <h4 className="font-bold text-sm">Không thể tải dữ liệu lịch hẹn</h4>
            <p className="text-xs mt-0.5 text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* Calendar Grid View */}
      <CalendarGrid
        selectedDate={selectedDate}
        staffList={visibleStaffList}
        bookings={bookings}
        businessOpenTime="08:30"
        businessCloseTime="20:00"
        onSelectBooking={(booking) => setActiveBooking(booking)}
        isLoading={isLoading}
      />

      {/* Quick Booking Preview Modal */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Chi tiết Lịch hẹn
                </span>
                <h3 className="font-black text-slate-900 text-lg">
                  #{activeBooking.id.substring(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setActiveBooking(null)}
                className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Customer */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {activeBooking.customerName}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                    <Phone className="w-3.5 h-3.5" />
                    {activeBooking.customerPhone}
                  </p>
                </div>
              </div>

              {/* Timing & Staff */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">
                    Thời gian
                  </span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {format(new Date(activeBooking.startTime), "HH:mm")} -{" "}
                    {format(new Date(activeBooking.endTime), "HH:mm")}
                  </div>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    ({formatDuration(activeBooking.totalDurationMins)})
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block mb-1">
                    Chuyên viên
                  </span>
                  <div className="font-bold text-slate-800 truncate">
                    {activeBooking.staff?.name || "Chưa gán"}
                  </div>
                  <span className="text-slate-400 text-[11px] block mt-0.5 truncate">
                    {activeBooking.staff?.role || "Kỹ thuật viên"}
                  </span>
                </div>
              </div>

              {/* Services List */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium text-xs block mb-2">
                  Dịch vụ đã chọn
                </span>
                <div className="space-y-1.5">
                  {activeBooking.bookingServices.map((bs) => (
                    <div
                      key={bs.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Scissors className="w-3.5 h-3.5 text-slate-400" />
                        {bs.service.name}
                      </div>
                      <span className="font-bold text-indigo-700">
                        {formatVND(bs.priceAtBooking)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Price & Status */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Tổng chi phí
                  </span>
                  <span className="text-xl font-black text-indigo-700">
                    {formatVND(activeBooking.totalPrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium mb-0.5">
                    Trạng thái
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {activeBooking.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer close */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
