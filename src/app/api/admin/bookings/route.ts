import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date-utils";
import { endOfDay, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bookings
 * Retrieve bookings for Calendar Grid & Timeline, with metrics summary
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");

    const targetDate = dateParam ? parseDateOnly(dateParam) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const whereClause: Record<string, unknown> = {
      startTime: {
        gte: dayStart,
        lte: dayEnd,
      },
    };

    if (staffId) {
      whereClause.staffId = staffId;
    }

    if (status) {
      whereClause.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        staff: true,
        bookingServices: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Compute day KPIs for Admin top cards
    const summary = {
      totalBookings: bookings.length,
      pendingCount: bookings.filter((b) => b.status === "PENDING").length,
      confirmedCount: bookings.filter((b) => b.status === "CONFIRMED").length,
      checkedInCount: bookings.filter((b) => b.status === "CHECKED_IN").length,
      completedCount: bookings.filter((b) => b.status === "COMPLETED").length,
      cancelledCount: bookings.filter((b) => b.status === "CANCELLED").length,
      noShowCount: bookings.filter((b) => b.status === "NO_SHOW").length,
      totalRevenue: bookings
        .filter((b) => b.status === "COMPLETED")
        .reduce((sum, b) => sum + b.totalPrice, 0),
      expectedRevenue: bookings
        .filter((b) => !["CANCELLED", "NO_SHOW"].includes(b.status))
        .reduce((sum, b) => sum + b.totalPrice, 0),
    };

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().slice(0, 10),
      summary,
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/bookings:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy danh sách lịch hẹn quản trị." },
      { status: 500 }
    );
  }
}
