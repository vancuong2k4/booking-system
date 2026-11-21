"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Scissors,
  Copy,
  Home,
  Search,
  XCircle,
  AlertCircle,
  Phone,
  Sparkles,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingDetail {
  id: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string | null;
  startTime: string;
  endTime: string;
  totalDurationMins: number;
  totalPrice: number;
  status: string;
  business: { name: string; openTime: string; closeTime: string };
  staff: { name: string; role: string } | null;
  bookingServices: {
    priceAtBooking: number;
    durationAtBooking: number;
    service: { name: string; durationMins: number };
  }[];
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: "Chờ xác nhận",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  CHECKED_IN: {
    label: "Đã check-in",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  NO_SHOW: {
    label: "Không đến",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} tiếng`;
}

function shortenId(id: string) {
  return id.substring(0, 8).toUpperCase();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: BookingDetail }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.PENDING;
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const isCancellable = ["PENDING", "CONFIRMED"].includes(booking.status);

  const copyId = async () => {
    await navigator.clipboard.writeText(booking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header gradient */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">Xác nhận đặt lịch</span>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} border`}
          >
            {statusCfg.label}
          </span>
        </div>
        <p className="text-white/80 text-xs mb-1">Mã đặt lịch của bạn</p>
        <div className="flex items-center gap-2">
          <span className="font-black text-2xl tracking-wider font-mono">
            #{shortenId(booking.id)}
          </span>
          <button
            onClick={copyId}
            className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            title="Sao chép mã đầy đủ"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Detail body */}
      <div className="px-6 py-5 space-y-4">
        {/* Customer info */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Khách hàng</p>
            <p className="font-bold text-slate-900">{booking.customerName}</p>
            <p className="text-sm text-slate-600">{booking.customerPhone}</p>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Date & time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Ngày</p>
              <p className="font-bold text-slate-800 text-sm">
                {format(startDate, "EEEE", { locale: vi }).replace(/^./, (c) =>
                  c.toUpperCase()
                )}
              </p>
              <p className="text-xs text-slate-600">
                {format(startDate, "dd/MM/yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Giờ</p>
              <p className="font-bold text-slate-800 text-sm">
                {format(startDate, "HH:mm")} – {format(endDate, "HH:mm")}
              </p>
              <p className="text-xs text-slate-600">
                {formatDuration(booking.totalDurationMins)}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Staff */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Chuyên viên</p>
            <p className="font-bold text-slate-800 text-sm">
              {booking.staff?.name ?? "Nhân viên sẽ được phân công"}
            </p>
            {booking.staff?.role && (
              <p className="text-xs text-slate-500">{booking.staff.role}</p>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Services list */}
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">
            Dịch vụ đã đặt
          </p>
          <div className="space-y-1.5">
            {booking.bookingServices.map((bs, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {bs.service.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDuration(bs.durationAtBooking)}
                  </p>
                </div>
                <span className="text-sm font-bold text-indigo-600">
                  {formatVND(bs.priceAtBooking)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
          <span className="font-bold text-slate-700">Tổng thanh toán</span>
          <span className="font-black text-lg text-indigo-600">
            {formatVND(booking.totalPrice)}
          </span>
        </div>

        {/* Note */}
        {booking.customerNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">
              Ghi chú
            </p>
            <p className="text-sm text-amber-800">{booking.customerNote}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </button>
          {isCancellable && (
            <button
              onClick={() =>
                document
                  .getElementById("cancel-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 font-semibold text-sm hover:bg-rose-50 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Hủy lịch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Section ───────────────────────────────────────────────────────────

function CancelSection({
  bookingId,
  currentStatus,
  onCancelled,
}: {
  bookingId: string;
  currentStatus: string;
  onCancelled: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isCancellable = ["PENDING", "CONFIRMED"].includes(currentStatus);

  if (!isCancellable) return null;

  const handleCancel = async () => {
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại để xác thực.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", customerPhone: phone }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Không thể hủy lịch hẹn.");
      }

      setSuccess(true);
      setTimeout(onCancelled, 1500);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Đã có lỗi khi hủy lịch hẹn."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        id="cancel-section"
        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="text-emerald-700 font-semibold text-sm">
          Lịch hẹn đã được hủy thành công!
        </p>
      </div>
    );
  }

  return (
    <div
      id="cancel-section"
      className="bg-white rounded-2xl border border-rose-200/80 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <XCircle className="w-5 h-5 text-rose-500" />
        <h3 className="font-bold text-slate-800">Hủy lịch hẹn</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Nhập số điện thoại đã đặt lịch để xác nhận hủy.
      </p>

      <div className="relative mb-3">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="tel"
          inputMode="numeric"
          placeholder="Số điện thoại (10 số)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 mb-3 text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4" />
            Xác nhận hủy lịch
          </>
        )}
      </button>
    </div>
  );
}

// ─── Lookup Section ───────────────────────────────────────────────────────────

function LookupSection() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BookingDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const cleaned = phone.trim();
    if (!cleaned || !/^0\d{9}$/.test(cleaned)) {
      setError("Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 số).");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(
        `/api/bookings?phone=${encodeURIComponent(cleaned)}`
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Không thể tra cứu lịch hẹn.");
      }

      setResults(json.data as BookingDetail[]);
      if (json.data.length === 0) {
        setError("Không tìm thấy lịch hẹn nào với số điện thoại này.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Đã có lỗi khi tra cứu lịch hẹn."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Search className="w-4 h-4 text-indigo-600" />
        </div>
        <h2 className="font-bold text-slate-800">Tra cứu lịch hẹn</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Nhập số điện thoại để xem toàn bộ lịch hẹn của bạn.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="0901 234 567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Tìm kiếm</span>
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            Tìm thấy {results.length} lịch hẹn
          </p>
          {results.map((b) => {
            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.PENDING;
            const startDate = new Date(b.startTime);
            return (
              <button
                key={b.id}
                onClick={() =>
                  router.push(`/booking-success?id=${b.id}`)
                }
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-sm text-slate-900 font-mono">
                      #{shortenId(b.id)}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {format(startDate, "EEEE, dd/MM/yyyy - HH:mm", {
                      locale: vi,
                    })}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {b.bookingServices.map((bs) => bs.service.name).join(", ")}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function BookingSuccessClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(!!bookingId);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Không thể tải thông tin lịch hẹn.");
      }
      setBooking(json.data as BookingDetail);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Đã có lỗi khi tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bookingId) {
      fetchBooking(bookingId);
    }
  }, [bookingId, fetchBooking]);

  const handleCancelled = () => {
    if (bookingId) fetchBooking(bookingId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900">
                Booking System
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Lịch hẹn của bạn
              </p>
            </div>
          </div>
          <a
            href="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            Đặt lịch mới
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Success Banner — only shown on fresh redirect */}
        {bookingId && !loading && booking && booking.status !== "CANCELLED" && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-3xl p-5 flex items-start gap-4 shadow-lg shadow-emerald-500/20">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-black text-lg leading-tight">
                Đặt lịch thành công! 🎉
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Chúng tôi sẽ liên hệ xác nhận lịch hẹn của bạn qua số điện
                thoại đã đăng ký.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">
              Đang tải thông tin lịch hẹn...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-800 mb-1">
                Không thể tải lịch hẹn
              </h3>
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          </div>
        )}

        {/* Booking Card */}
        {booking && !loading && <BookingCard booking={booking} />}

        {/* Cancel Section */}
        {booking && !loading && (
          <CancelSection
            bookingId={booking.id}
            currentStatus={booking.status}
            onCancelled={handleCancelled}
          />
        )}

        {/* Lookup Section (always visible) */}
        <LookupSection />
      </main>
    </div>
  );
}
