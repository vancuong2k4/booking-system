"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Business, Service, Staff } from "@prisma/client";
import { AvailableSlot } from "@/types/booking";
import StepServices from "./StepServices";
import StepStaff from "./StepStaff";
import StepDateTime from "./StepDateTime";
import StepConfirmation from "./StepConfirmation";
import BookingSummary from "./BookingSummary";
import { Check, Sparkles, AlertCircle } from "lucide-react";

interface BookingWizardProps {
  business: Business | null;
  services: Service[];
  staffList: Staff[];
}

const STEPS = [
  { id: 1, title: "Dịch vụ", description: "Chọn dịch vụ" },
  { id: 2, title: "Chuyên viên", description: "Chọn thợ" },
  { id: 3, title: "Thời gian", description: "Chọn ngày & giờ" },
  { id: 4, title: "Xác nhận", description: "Điền thông tin" },
];

export default function BookingWizard({
  business,
  services,
  staffList,
}: BookingWizardProps) {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Toggle selection of services (Step 1)
  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      // Reset chosen slot when services change because duration changes
      setSelectedSlot(null);
      return next;
    });
  };

  // Staff selection (Step 2)
  const handleSelectStaff = (staffId: string | null) => {
    setSelectedStaffId(staffId);
    setSelectedSlot(null); // Reset slot
    setCurrentStep(3); // Smooth auto-advance to step 3
  };

  // Date selection (Step 3)
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // Slot selection (Step 3)
  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setCurrentStep(4); // Smooth auto-advance to confirmation
  };

  // Final booking submission (Step 4)
  const handleSubmitBooking = async (formData: {
    customerName: string;
    customerPhone: string;
    customerNote?: string;
  }) => {
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const payload = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerNote: formData.customerNote,
        serviceIds: selectedServiceIds,
        staffId: selectedStaffId || undefined,
        startTime: selectedSlot.startTime,
        businessId: business?.id,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Đặt lịch không thành công.");
      }

      // Navigate to success page
      router.push(`/booking-success?id=${json.data.id}`);
    } catch (err: unknown) {
      setSubmissionError(
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra trong quá trình đặt lịch. Vui lòng thử lại!"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolved entities
  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id)
  );
  const selectedStaff = staffList.find((st) => st.id === selectedStaffId) || null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-36">
      {/* Top Salon Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                {business?.name || "Booking System"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Mở cửa: {business?.openTime || "08:30"} - {business?.closeTime || "20:00"} hàng ngày
              </p>
            </div>
          </div>

          <a
            href="/admin"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
          >
            Dành cho Quản trị
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {STEPS.map((step) => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  onClick={() => {
                    // Allow clicking back to completed steps
                    if (step.id < currentStep) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`flex flex-col items-center text-center group ${
                    step.id < currentStep ? "cursor-pointer" : ""
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 mb-2 ${
                      isDone
                        ? "bg-emerald-500 text-white shadow-sm"
                        : isCurrent
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : step.id}
                  </div>
                  <span
                    className={`text-xs font-bold transition-colors ${
                      isCurrent
                        ? "text-indigo-600"
                        : isDone
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {step.description}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Connected Line */}
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 ease-out"
              style={{
                width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Global Error Banner if any */}
        {submissionError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <h4 className="font-bold text-sm">Rất tiếc! Đã xảy ra lỗi</h4>
              <p className="text-xs mt-0.5 text-rose-600">{submissionError}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs">
          {currentStep === 1 && (
            <StepServices
              services={services}
              selectedServiceIds={selectedServiceIds}
              onToggleService={handleToggleService}
            />
          )}

          {currentStep === 2 && (
            <StepStaff
              staffList={staffList}
              selectedStaffId={selectedStaffId}
              onSelectStaff={handleSelectStaff}
            />
          )}

          {currentStep === 3 && (
            <StepDateTime
              selectedServiceIds={selectedServiceIds}
              selectedStaffId={selectedStaffId}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onSelectDate={handleSelectDate}
              onSelectSlot={handleSelectSlot}
            />
          )}

          {currentStep === 4 && selectedSlot && (
            <StepConfirmation
              selectedServices={selectedServices}
              selectedStaff={selectedStaff}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              isSubmitting={isSubmitting}
              onSubmitBooking={handleSubmitBooking}
            />
          )}
        </div>
      </main>

      {/* Floating Bottom Sticky Summary Bar */}
      <BookingSummary
        currentStep={currentStep}
        totalSteps={STEPS.length}
        selectedServices={selectedServices}
        selectedStaff={selectedStaff}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onNext={() => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))}
        onBack={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
      />
    </div>
  );
}
