"use client";

import React from "react";
import { Service, Staff } from "@prisma/client";
import { AvailableSlot } from "@/types/booking";
import { formatDuration, formatVND } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

interface BookingSummaryProps {
  currentStep: number;
  totalSteps: number;
  selectedServices: Service[];
  selectedStaff: Staff | null;
  selectedDate: Date;
  selectedSlot: AvailableSlot | null;
  onNext: () => void;
  onBack: () => void;
}

export default function BookingSummary({
  currentStep,
  totalSteps,
  selectedServices,
  selectedStaff,
  selectedDate,
  selectedSlot,
  onNext,
  onBack,
}: BookingSummaryProps) {
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMins, 0);

  // Validate next button
  const canProceed = () => {
    if (currentStep === 1) return selectedServices.length > 0;
    if (currentStep === 2) return true; // null is valid (auto-assign)
    if (currentStep === 3) return selectedSlot !== null;
    return false; // Step 4 has its own submit
  };

  if (currentStep === totalSteps) {
    // In step 4, the form has its own action, but back button is helpful
    return (
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại bước trước</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] p-4 sm:p-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left summary indicators */}
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-start">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tạm tính ({selectedServices.length} dịch vụ)
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatVND(totalPrice)}
            </div>
          </div>

          <div className="h-9 w-px bg-slate-200 hidden sm:block"></div>

          <div className="text-right sm:text-left">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 sm:justify-start justify-end">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Thời lượng</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-700">
              {totalDuration > 0 ? formatDuration(totalDuration) : "0 phút"}
            </div>
          </div>

          {selectedSlot && (
            <>
              <div className="h-9 w-px bg-slate-200 hidden md:block"></div>
              <div className="hidden md:block">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Khung giờ
                </div>
                <div className="text-sm font-bold text-indigo-600">
                  {selectedSlot.time} ({format(selectedDate, "dd/MM")})
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-all cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
          )}

          <button
            type="button"
            disabled={!canProceed()}
            onClick={onNext}
            className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span>Tiếp tục</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
