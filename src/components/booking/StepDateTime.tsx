"use client";

import React, { useState, useEffect } from "react";
import { AvailableSlot } from "@/types/booking";
import { addDays, format, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Clock, Sun, Sunset, Moon, AlertCircle, Loader2 } from "lucide-react";

interface StepDateTimeProps {
  selectedServiceIds: string[];
  selectedStaffId: string | null;
  selectedDate: Date;
  selectedSlot: AvailableSlot | null;
  onSelectDate: (date: Date) => void;
  onSelectSlot: (slot: AvailableSlot) => void;
}

export default function StepDateTime({
  selectedServiceIds,
  selectedStaffId,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
}: StepDateTimeProps) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate next 14 days
  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // Fetch slots whenever selectedDate, selectedServiceIds, or selectedStaffId changes
  useEffect(() => {
    if (selectedServiceIds.length === 0) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const serviceIdsParam = selectedServiceIds.join(",");
        let url = `/api/availability?date=${dateStr}&serviceIds=${serviceIdsParam}`;
        if (selectedStaffId) {
          url += `&staffId=${selectedStaffId}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Không thể tải khung giờ trống.");
        }

        if (isMounted) {
          setSlots(json.data.slots || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
          setSlots([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSlots();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedServiceIds, selectedStaffId]);

  // Group slots into Morning (< 12:00), Afternoon (12:00 - 17:00), Evening (>= 17:00)
  const morningSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(":")[0], 10);
    return hour < 12;
  });

  const afternoonSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(":")[0], 10);
    return hour >= 12 && hour < 17;
  });

  const eveningSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(":")[0], 10);
    return hour >= 17;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Bước 3: Chọn ngày & khung giờ trống
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Hệ thống tính toán thời gian thực các khung giờ phù hợp với tổng thời lượng dịch vụ của bạn.
        </p>
      </div>

      {/* 14-day horizontal selector */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Chọn ngày hẹn</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {next14Days.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = idx === 0;

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => onSelectDate(date)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl border-2 text-center transition-all duration-150 min-w-[76px] ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                }`}
              >
                <div
                  className={`text-[11px] font-medium uppercase ${
                    isSelected ? "text-indigo-100" : "text-slate-400"
                  }`}
                >
                  {isToday ? "Hôm nay" : format(date, "EEE", { locale: vi })}
                </div>
                <div className="text-lg font-bold my-0.5">{format(date, "dd")}</div>
                <div
                  className={`text-[11px] font-medium ${
                    isSelected ? "text-indigo-100" : "text-slate-400"
                  }`}
                >
                  Th{format(date, "M")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots container */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-5 sm:p-6 min-h-[280px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Đang tìm các khung giờ trống phù hợp...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-rose-500">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <Clock className="w-10 h-10 mb-3 text-slate-300" />
            <h4 className="font-semibold text-slate-700 text-base">
              Không có khung giờ nào còn trống trong ngày này
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Có thể tất cả nhân viên đã kín lịch hoặc đã hết giờ làm việc. Bạn vui lòng chọn một ngày khác nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Morning */}
            {morningSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Buổi sáng (Trước 12:00)</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all duration-150 flex flex-col items-center justify-center ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <span>{slot.time}</span>
                        {!selectedStaffId && slot.availableStaff.length > 1 && (
                          <span
                            className={`text-[10px] font-normal ${
                              isSelected ? "text-indigo-100" : "text-emerald-600"
                            }`}
                          >
                            {slot.availableStaff.length} thợ rảnh
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Afternoon */}
            {afternoonSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Sunset className="w-4 h-4 text-orange-500" />
                  <span>Buổi chiều (12:00 - 17:00)</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all duration-150 flex flex-col items-center justify-center ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <span>{slot.time}</span>
                        {!selectedStaffId && slot.availableStaff.length > 1 && (
                          <span
                            className={`text-[10px] font-normal ${
                              isSelected ? "text-indigo-100" : "text-emerald-600"
                            }`}
                          >
                            {slot.availableStaff.length} thợ rảnh
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evening */}
            {eveningSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Buổi tối (Sau 17:00)</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {eveningSlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-sm transition-all duration-150 flex flex-col items-center justify-center ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20"
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <span>{slot.time}</span>
                        {!selectedStaffId && slot.availableStaff.length > 1 && (
                          <span
                            className={`text-[10px] font-normal ${
                              isSelected ? "text-indigo-100" : "text-emerald-600"
                            }`}
                          >
                            {slot.availableStaff.length} thợ rảnh
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
