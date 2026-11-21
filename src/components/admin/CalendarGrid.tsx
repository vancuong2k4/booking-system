"use client";

import React, { useMemo } from "react";
import { format, isToday } from "date-fns";
import { Staff, StaffSchedule } from "@prisma/client";
import {
  Clock,
  User,
  Coffee,
  CheckCircle,
  AlertCircle,
  Scissors,
} from "lucide-react";
import { formatVND, formatDuration } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminBookingWithRelations {
  id: string;
  businessId: string;
  staffId: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string | null;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  totalDurationMins: number;
  totalPrice: number;
  status: string;
  staff: Staff;
  bookingServices: {
    id: string;
    priceAtBooking: number;
    durationAtBooking: number;
    service: {
      id: string;
      name: string;
    };
  }[];
}

export type StaffWithSchedules = Staff & {
  schedules?: StaffSchedule[];
};

interface CalendarGridProps {
  selectedDate: Date;
  staffList: StaffWithSchedules[];
  bookings: AdminBookingWithRelations[];
  businessOpenTime?: string; // "08:30"
  businessCloseTime?: string; // "20:00"
  onSelectBooking?: (booking: AdminBookingWithRelations) => void;
  isLoading?: boolean;
}

// ─── Helpers & Constants ─────────────────────────────────────────────────────

const ROW_HEIGHT = 68; // pixels per 30 minutes
const MINS_PER_ROW = 30;
const PX_PER_MIN = ROW_HEIGHT / MINS_PER_ROW; // ~2.266 px/min

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

const STATUS_STYLE_MAP: Record<
  string,
  {
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  CONFIRMED: {
    bg: "bg-emerald-50/95 hover:bg-emerald-100/95",
    border: "border-l-4 border-l-emerald-600 border-emerald-200",
    badgeBg: "bg-emerald-100 text-emerald-800",
    badgeText: "text-emerald-900",
    label: "Đã xác nhận",
  },
  CHECKED_IN: {
    bg: "bg-sky-50/95 hover:bg-sky-100/95",
    border: "border-l-4 border-l-sky-600 border-sky-200",
    badgeBg: "bg-sky-100 text-sky-800",
    badgeText: "text-sky-900",
    label: "Đang phục vụ",
  },
  PENDING: {
    bg: "bg-amber-50/95 hover:bg-amber-100/95",
    border: "border-l-4 border-l-amber-500 border-amber-200",
    badgeBg: "bg-amber-100 text-amber-800",
    badgeText: "text-amber-900",
    label: "Chờ duyệt",
  },
  COMPLETED: {
    bg: "bg-slate-100/95 hover:bg-slate-200/95",
    border: "border-l-4 border-l-slate-600 border-slate-300",
    badgeBg: "bg-slate-200 text-slate-800",
    badgeText: "text-slate-900",
    label: "Hoàn thành",
  },
  CANCELLED: {
    bg: "bg-rose-50/80 hover:bg-rose-100/80 opacity-70",
    border: "border-l-4 border-l-rose-500 border-rose-200",
    badgeBg: "bg-rose-100 text-rose-800",
    badgeText: "text-rose-900",
    label: "Đã hủy",
  },
  NO_SHOW: {
    bg: "bg-orange-50/90 hover:bg-orange-100/90",
    border: "border-l-4 border-l-orange-500 border-orange-200",
    badgeBg: "bg-orange-100 text-orange-800",
    badgeText: "text-orange-900",
    label: "Không đến",
  },
};

export default function CalendarGrid({
  selectedDate,
  staffList,
  bookings,
  businessOpenTime = "08:30",
  businessCloseTime = "20:00",
  onSelectBooking,
  isLoading = false,
}: CalendarGridProps) {
  // 1. Compute timeline grid start & end (snapped to 30 mins)
  const openMins = timeStringToMinutes(businessOpenTime);
  const closeMins = timeStringToMinutes(businessCloseTime);

  // Round grid start down to nearest hour or half-hour (e.g. 08:30 -> 08:00 or 08:30)
  const gridStartMins = Math.floor(openMins / 30) * 30;
  const gridEndMins = Math.ceil(closeMins / 30) * 30;

  // Generate 30-min time labels
  const timeSlots = useMemo(() => {
    const slots: { timeStr: string; minutes: number }[] = [];
    for (let m = gridStartMins; m <= gridEndMins; m += 30) {
      slots.push({
        timeStr: minutesToTimeString(m),
        minutes: m,
      });
    }
    return slots;
  }, [gridStartMins, gridEndMins]);

  const totalGridHeight = (gridEndMins - gridStartMins) * PX_PER_MIN;

  // 2. Map dayOfWeek (0: Sunday, 1: Monday, ... 6: Saturday)
  const dayOfWeek = selectedDate.getDay();

  // 3. Current time line indicator
  const now = new Date();
  const isSelectedToday = isToday(selectedDate);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showCurrentTimeLine =
    isSelectedToday && nowMinutes >= gridStartMins && nowMinutes <= gridEndMins;
  const currentTimeTop = (nowMinutes - gridStartMins) * PX_PER_MIN;

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center min-h-[500px]">
        <div className="animate-spin w-9 h-9 rounded-full border-4 border-indigo-200 border-t-indigo-600 mb-3" />
        <p className="text-sm font-bold text-slate-600">
          Đang tải dữ liệu lịch biểu...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Scrollable Container with horizontal & vertical sync */}
      <div className="overflow-x-auto relative">
        <div
          className="min-w-[800px]"
          style={{ width: `${Math.max(100, (staffList.length + 1) * 260)}px` }}
        >
          {/* Header Row: Staff columns */}
          <div className="flex border-b border-slate-200/80 bg-slate-50/90 sticky top-0 z-20">
            {/* Time label placeholder */}
            <div className="w-20 shrink-0 border-r border-slate-200/80 p-4 flex flex-col justify-end text-slate-400 font-bold text-[11px] uppercase tracking-wider text-center">
              Giờ
            </div>

            {/* Staff Headers */}
            {staffList.map((staff) => {
              // Find schedule for this day of week
              const todaySchedule = staff.schedules?.find(
                (s) => s.dayOfWeek === dayOfWeek
              );
              const isWorking = todaySchedule?.isWorkingDay ?? true;

              return (
                <div
                  key={staff.id}
                  className="flex-1 min-w-[240px] p-3.5 border-r border-slate-200/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 overflow-hidden">
                      {staff.avatar ? (
                        <img
                          src={staff.avatar}
                          alt={staff.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{staff.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {staff.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {staff.role}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isWorking ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {todaySchedule
                          ? `${todaySchedule.startTime}-${todaySchedule.endTime}`
                          : "Làm việc"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        Nghỉ ca
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Body */}
          <div
            className="flex relative"
            style={{ height: `${totalGridHeight}px` }}
          >
            {/* Time labels column */}
            <div className="w-20 shrink-0 border-r border-slate-200/80 relative bg-slate-50/40 select-none">
              {timeSlots.map((slot) => {
                const top = (slot.minutes - gridStartMins) * PX_PER_MIN;
                return (
                  <div
                    key={slot.minutes}
                    className="absolute w-full text-center pr-2"
                    style={{ top: `${top}px`, transform: "translateY(-50%)" }}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        slot.minutes % 60 === 0
                          ? "text-slate-800 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {slot.timeStr}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Staff Columns */}
            {staffList.map((staff) => {
              const staffBookings = bookings.filter(
                (b) => b.staffId === staff.id
              );
              const todaySchedule = staff.schedules?.find(
                (s) => s.dayOfWeek === dayOfWeek
              );
              const isWorkingDay = todaySchedule?.isWorkingDay ?? true;

              return (
                <div
                  key={staff.id}
                  className="flex-1 min-w-[240px] border-r border-slate-200/80 relative"
                >
                  {/* Background 30-min grid lines */}
                  {timeSlots.map((slot) => {
                    const top = (slot.minutes - gridStartMins) * PX_PER_MIN;
                    return (
                      <div
                        key={slot.minutes}
                        className={`absolute w-full border-t ${
                          slot.minutes % 60 === 0
                            ? "border-slate-200/90"
                            : "border-slate-100"
                        }`}
                        style={{ top: `${top}px` }}
                      />
                    );
                  })}

                  {/* Off-Day Shaded Overlay */}
                  {!isWorkingDay && (
                    <div className="absolute inset-0 bg-slate-100/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
                      <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs text-center">
                        <Coffee className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-600">
                          Nhân viên nghỉ hôm nay
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Lunch Break Shaded Strip */}
                  {isWorkingDay &&
                    todaySchedule?.breakStart &&
                    todaySchedule?.breakEnd && (() => {
                      const bStart = timeStringToMinutes(
                        todaySchedule.breakStart
                      );
                      const bEnd = timeStringToMinutes(todaySchedule.breakEnd);
                      if (bEnd > gridStartMins && bStart < gridEndMins) {
                        const top = Math.max(
                          0,
                          (bStart - gridStartMins) * PX_PER_MIN
                        );
                        const height = (bEnd - bStart) * PX_PER_MIN;
                        return (
                          <div
                            key="break"
                            className="absolute w-full bg-amber-50/50 border-y border-dashed border-amber-200/80 flex items-center justify-center z-5 pointer-events-none"
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <span className="text-[11px] font-bold text-amber-600/80 flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-md shadow-xs">
                              <Coffee className="w-3 h-3" />
                              Nghỉ trưa ({todaySchedule.breakStart} -{" "}
                              {todaySchedule.breakEnd})
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                  {/* Booking Blocks for this staff */}
                  {staffBookings.map((booking) => {
                    const bStartDate = new Date(booking.startTime);
                    const bEndDate = new Date(booking.endTime);

                    const startMins =
                      bStartDate.getHours() * 60 + bStartDate.getMinutes();
                    const endMins =
                      bEndDate.getHours() * 60 + bEndDate.getMinutes();

                    // Relative positioning
                    const top = (startMins - gridStartMins) * PX_PER_MIN;
                    const height = Math.max(
                      (endMins - startMins) * PX_PER_MIN,
                      ROW_HEIGHT * 0.75
                    );

                    const styleConfig =
                      STATUS_STYLE_MAP[booking.status] ||
                      STATUS_STYLE_MAP.CONFIRMED;

                    const formattedStartTime = format(bStartDate, "HH:mm");
                    const formattedEndTime = format(bEndDate, "HH:mm");

                    return (
                      <div
                        key={booking.id}
                        onClick={() => onSelectBooking?.(booking)}
                        className={`absolute left-1.5 right-1.5 rounded-2xl p-2.5 border shadow-sm transition-all duration-200 cursor-pointer overflow-hidden z-10 flex flex-col justify-between ${styleConfig.bg} ${styleConfig.border}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                        title={`Lịch hẹn #${booking.id} - ${booking.customerName}`}
                      >
                        {/* Top: Customer name & Status badge */}
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {booking.customerName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${styleConfig.badgeBg}`}
                            >
                              {styleConfig.label}
                            </span>
                          </div>

                          {/* Time & Duration badge */}
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {formattedStartTime} - {formattedEndTime}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({formatDuration(booking.totalDurationMins)})
                            </span>
                          </div>

                          {/* Services List preview */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium truncate">
                            <Scissors className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {booking.bookingServices
                                .map((bs) => bs.service.name)
                                .join(", ")}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Total Price & Phone */}
                        <div className="pt-1 mt-auto border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-500">
                            {booking.customerPhone}
                          </span>
                          <span className="font-black text-indigo-700">
                            {formatVND(booking.totalPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Current Time Horizontal Line */}
            {showCurrentTimeLine && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                style={{ top: `${currentTimeTop}px` }}
              >
                <div className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-r shadow-xs">
                  {format(now, "HH:mm")}
                </div>
                <div className="flex-1 border-t-2 border-rose-500 shadow-xs" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
