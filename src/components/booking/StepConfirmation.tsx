"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { phoneRegex } from "@/lib/validations";
import { Service, Staff } from "@prisma/client";
import { AvailableSlot } from "@/types/booking";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatDuration, formatVND } from "@/lib/utils";
import {
  User,
  Phone,
  FileText,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const step4FormSchema = z.object({
  customerName: z
    .string()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không quá 100 ký tự"),
  customerPhone: z
    .string()
    .regex(phoneRegex, "Số điện thoại không hợp lệ (VD: 0901234567)"),
  customerNote: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

type Step4FormData = z.infer<typeof step4FormSchema>;

interface StepConfirmationProps {
  selectedServices: Service[];
  selectedStaff: Staff | null;
  selectedDate: Date;
  selectedSlot: AvailableSlot;
  isSubmitting: boolean;
  onSubmitBooking: (formData: Step4FormData) => void;
}

export default function StepConfirmation({
  selectedServices,
  selectedStaff,
  selectedDate,
  selectedSlot,
  isSubmitting,
  onSubmitBooking,
}: StepConfirmationProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step4FormData>({
    resolver: zodResolver(step4FormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerNote: "",
    },
  });

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMins, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Bước 4: Xác nhận & Điền thông tin đặt lịch
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Vui lòng kiểm tra lại thông tin lịch hẹn và cung cấp số điện thoại để tiệm giữ chỗ cho bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Recap card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Chi tiết lịch hẹn
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Không cần cọc
            </span>
          </div>

          {/* Time & Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-indigo-200 text-sm">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="capitalize">
                {format(selectedDate, "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-white font-bold text-lg">
              <Clock className="w-5 h-5 text-indigo-400" />
              <span>Khung giờ: {selectedSlot.time}</span>
              <span className="text-xs font-normal text-indigo-200">
                ({formatDuration(totalDuration)})
              </span>
            </div>
          </div>

          {/* Staff */}
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/50 flex items-center justify-center text-white shrink-0">
              {selectedStaff?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedStaff.avatar}
                  alt={selectedStaff.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <div className="text-xs text-indigo-200">Chuyên viên phụ trách:</div>
              <div className="font-semibold text-sm text-white">
                {selectedStaff ? selectedStaff.name : "Tự động phân bổ thợ rảnh"}
              </div>
            </div>
          </div>

          {/* Services list */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Dịch vụ đã chọn ({selectedServices.length})
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {selectedServices.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-white/5"
                >
                  <span className="text-slate-200 font-medium">{s.name}</span>
                  <span className="font-bold text-white shrink-0 ml-2">
                    {formatVND(s.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Price */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm text-indigo-200 font-medium">Tổng thanh toán dự kiến:</span>
            <span className="text-xl font-extrabold text-amber-300">
              {formatVND(totalPrice)}
            </span>
          </div>
        </div>

        {/* Right column: Customer Contact Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit(onSubmitBooking)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Họ và tên của bạn <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  {...register("customerName")}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    errors.customerName
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500"
                      : "border-slate-200 bg-slate-50/50 focus:ring-indigo-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.customerName && (
                <p className="text-xs text-rose-500 mt-1.5 font-medium">
                  {errors.customerName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="Ví dụ: 0901234567"
                  {...register("customerPhone")}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    errors.customerPhone
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500"
                      : "border-slate-200 bg-slate-50/50 focus:ring-indigo-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.customerPhone && (
                <p className="text-xs text-rose-500 mt-1.5 font-medium">
                  {errors.customerPhone.message}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                Số điện thoại dùng để nhận tin nhắn xác nhận và tra cứu / hủy lịch khi cần.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Ghi chú thêm cho tiệm (Tùy chọn)
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <textarea
                  rows={3}
                  placeholder="Yêu cầu riêng, tiền sử dị ứng mỹ phẩm, kiểu tóc mong muốn..."
                  {...register("customerNote")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Chúng tôi tôn trọng quyền riêng tư. Thông tin của bạn chỉ được dùng để phục vụ xác nhận lịch hẹn tại cửa hàng.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý đặt lịch...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Xác nhận Đặt lịch ngay</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
