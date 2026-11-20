"use client";

import React from "react";
import { Staff } from "@prisma/client";
import { Sparkles, User, Check, ShieldCheck } from "lucide-react";

interface StepStaffProps {
  staffList: Staff[];
  selectedStaffId: string | null;
  onSelectStaff: (staffId: string | null) => void;
}

export default function StepStaff({
  staffList,
  selectedStaffId,
  onSelectStaff,
}: StepStaffProps) {
  const isAutoAssign = selectedStaffId === null || selectedStaffId === "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Bước 2: Chọn chuyên viên thực hiện
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Chọn thợ quen mà bạn tin tưởng hoặc để hệ thống tự động tìm thợ rảnh nhanh nhất.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Option: Auto-assign "Bất kỳ ai còn trống" */}
        <div
          onClick={() => onSelectStaff(null)}
          className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
            isAutoAssign
              ? "border-indigo-600 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 shadow-md ring-2 ring-indigo-600/10"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>

            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                isAutoAssign
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {isAutoAssign && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-slate-900 text-base">
                Bất kỳ ai còn trống
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Nhanh nhất
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Hệ thống sẽ tự động chỉ định chuyên viên có lịch làm việc và tay nghề tốt nhất cho bạn.
            </p>
          </div>
        </div>

        {/* Individual Staff Cards */}
        {staffList.map((staff) => {
          const isSelected = selectedStaffId === staff.id;
          return (
            <div
              key={staff.id}
              onClick={() => onSelectStaff(staff.id)}
              className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-600/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="relative">
                  {staff.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={staff.avatar}
                      alt={staff.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-semibold border border-slate-200">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>

                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  {staff.name}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{staff.role || "Chuyên viên"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
