import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { walkInBookingSchema } from "@/lib/validations";
import { addMinutes, isOverlapping } from "@/lib/date-utils";
import { ZodError } from "zod";

/**
 * POST /api/admin/bookings/walk-in
 * Rapid booking dispatch for walk-in clients at the reception counter
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = walkInBookingSchema.parse(body);

    const startTime = validated.startTime ? new Date(validated.startTime) : new Date();
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { success: false, message: "Thời gian bắt đầu không hợp lệ." },
        { status: 400 }
      );
    }

    const business = validated.businessId
      ? await prisma.business.findUnique({ where: { id: validated.businessId } })
      : await prisma.business.findFirst();

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy cơ sở dịch vụ." },
        { status: 404 }
      );
    }

    const staff = await prisma.staff.findFirst({
      where: {
        id: validated.staffId,
        businessId: business.id,
        isActive: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Nhân viên phục vụ không tồn tại hoặc đã nghỉ." },
        { status: 404 }
      );
    }

    const services = await prisma.service.findMany({
      where: {
        id: { in: validated.serviceIds },
        businessId: business.id,
        isActive: true,
      },
    });

    if (services.length !== validated.serviceIds.length) {
      return NextResponse.json(
        { success: false, message: "Một hoặc nhiều dịch vụ đã chọn không khả dụng." },
        { status: 400 }
      );
    }

    const totalDurationMins = services.reduce((sum, s) => sum + s.durationMins, 0);
    const totalBufferMins = services.reduce((sum, s) => sum + s.bufferMins, 0);
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    const endTime = addMinutes(startTime, totalDurationMins);
    const occupancyEnd = addMinutes(startTime, totalDurationMins + totalBufferMins);

    // Create walk-in booking atomically with status CHECKED_IN
    const walkInBooking = await prisma.$transaction(async (tx) => {
      // Check for conflicting active bookings for this staff
      const existingBookings = await tx.booking.findMany({
        where: {
          staffId: staff.id,
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
          startTime: { lte: occupancyEnd },
          endTime: { gte: startTime },
        },
        include: {
          bookingServices: { include: { service: true } },
        },
      });

      const hasConflict = existingBookings.some((b) => {
        const bBuffer = b.bookingServices.reduce(
          (sum, bs) => sum + (bs.service?.bufferMins || 0),
          0
        );
        const bOccupancyEnd = addMinutes(b.endTime, bBuffer);
        return isOverlapping(startTime, occupancyEnd, b.startTime, bOccupancyEnd);
      });

      if (hasConflict) {
        throw new Error(
          `Nhân viên ${staff.name} đang có ca phục vụ khác trong khung giờ này!`
        );
      }

      return tx.booking.create({
        data: {
          businessId: business.id,
          staffId: staff.id,
          customerName: validated.customerName || "Khách vãng lai",
          customerPhone: validated.customerPhone || "0000000000",
          customerNote: validated.customerNote || "Khách vãng lai tại quầy",
          startTime,
          endTime,
          totalDurationMins,
          totalPrice,
          status: "CHECKED_IN", // Walk-in is immediately checked-in
          bookingServices: {
            create: services.map((s) => ({
              serviceId: s.id,
              priceAtBooking: s.price,
              durationAtBooking: s.durationMins,
            })),
          },
        },
        include: {
          business: true,
          staff: true,
          bookingServices: {
            include: { service: true },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tiếp nhận khách vãng lai và nhận ca thành công!",
        data: walkInBooking,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu khách vãng lai không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Lỗi hệ thống khi tạo lịch khách vãng lai.";
    return NextResponse.json({ success: false, message }, { status: 409 });
  }
}
