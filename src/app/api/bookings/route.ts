import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validations";
import { createBooking } from "@/lib/booking-service";
import { AppError } from "@/lib/errors";
import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import { endOfDay, startOfDay } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings
 * Create an appointment with database transaction locking
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createBookingSchema.parse(body);

    const booking = await createBooking(validatedData);

    return NextResponse.json(
      {
        success: true,
        message: "Đặt lịch hẹn thành công!",
        data: booking,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu đặt lịch không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error("Unhandled error in POST /api/bookings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Đã có lỗi hệ thống xảy ra khi xử lý đặt lịch.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings
 * Lookup bookings by customer phone, date, staff, or status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const date = searchParams.get("date");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");

    const whereFilter: Record<string, unknown> = {};

    if (phone) {
      whereFilter.customerPhone = phone.trim();
    }

    if (staffId) {
      whereFilter.staffId = staffId;
    }

    if (status) {
      whereFilter.status = status;
    }

    if (date) {
      const targetDate = parseDateOnly(date);
      whereFilter.startTime = {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereFilter,
      include: {
        staff: true,
        bookingServices: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Unhandled error in GET /api/bookings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy danh sách lịch hẹn.",
      },
      { status: 500 }
    );
  }
}
