import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateBookingStatusSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid transitions defined in ARCHITECTURE.md Section 3.2
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // Terminal state
  CANCELLED: ["PENDING", "CONFIRMED"], // Allow admin reinstatement if needed
  NO_SHOW: ["CONFIRMED"], // Allow admin reinstate
};

/**
 * PATCH /api/admin/bookings/[id]/status
 * Update status of an appointment with lifecycle transition validation
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateBookingStatusSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        staff: true,
        bookingServices: { include: { service: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lịch hẹn." },
        { status: 404 }
      );
    }

    const currentStatus = booking.status;
    const newStatus = validated.status;

    if (currentStatus === newStatus) {
      return NextResponse.json({
        success: true,
        message: `Lịch hẹn đã ở trạng thái ${newStatus}.`,
        data: booking,
      });
    }

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể chuyển trạng thái từ ${currentStatus} sang ${newStatus}. Các trạng thái cho phép: ${allowedTransitions.join(", ") || "Không có (Đã kết thúc)"}.`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: newStatus },
      include: {
        staff: true,
        bookingServices: { include: { service: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật trạng thái lịch hẹn sang ${newStatus}!`,
      data: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Trạng thái không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("Error in PATCH /api/admin/bookings/[id]/status:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi cập nhật trạng thái lịch hẹn." },
      { status: 500 }
    );
  }
}
