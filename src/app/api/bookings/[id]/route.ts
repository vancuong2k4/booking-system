import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings/[id]
 * Retrieve a single booking detail by ID.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true, openTime: true, closeTime: true },
        },
        staff: {
          select: { id: true, name: true, role: true, avatar: true },
        },
        bookingServices: {
          include: {
            service: {
              select: { id: true, name: true, durationMins: true, bufferMins: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lịch hẹn với mã này." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi tra cứu lịch hẹn." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Cancel a booking (only PENDING or CONFIRMED can be cancelled by customer).
 * Body: { action: "cancel", customerPhone: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, customerPhone } = body as {
      action: string;
      customerPhone?: string;
    };

    if (action !== "cancel") {
      throw new AppError("Hành động không hợp lệ.", 400);
    }

    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lịch hẹn với mã này." },
        { status: 404 }
      );
    }

    // Verify ownership via phone number
    if (customerPhone && booking.customerPhone !== customerPhone.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Số điện thoại không khớp với lịch hẹn. Vui lòng kiểm tra lại.",
        },
        { status: 403 }
      );
    }

    // Only allow cancellation of PENDING or CONFIRMED
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể hủy lịch ở trạng thái "${booking.status}". Chỉ có thể hủy lịch chưa đến hoặc đã xác nhận.`,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      message: "Lịch hẹn đã được hủy thành công.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error("PATCH /api/bookings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi hủy lịch hẹn." },
      { status: 500 }
    );
  }
}
