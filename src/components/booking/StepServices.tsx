"use client";

import React, { useState } from "react";
import { Service } from "@prisma/client";
import { formatDuration, formatVND } from "@/lib/utils";
import { Check, Clock, Sparkles, Search } from "lucide-react";

interface StepServicesProps {
  services: Service[];
  selectedServiceIds: string[];
  onToggleService: (serviceId: string) => void;
}

export default function StepServices({
  services,
  selectedServiceIds,
  onToggleService,
}: StepServicesProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Bước 1: Chọn dịch vụ bạn mong muốn
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Bạn có thể chọn một hoặc nhiều dịch vụ kết hợp cùng lúc.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm dịch vụ (cắt tóc, gội đầu, uốn, dưỡng da...)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
        />
      </div>

      {/* Service List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id);
          return (
            <div
              key={service.id}
              onClick={() => onToggleService(service.id)}
              className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-600/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-base flex items-center gap-1.5">
                      {service.name}
                      {isSelected && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          Đã chọn
                        </span>
                      )}
                    </h3>
                    {service.description && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDuration(service.durationMins)}</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-900">
                    {formatVND(service.price)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Không tìm thấy dịch vụ nào phù hợp với từ khóa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
