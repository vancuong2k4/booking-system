import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateStaffSchedulesSchema } from "@/lib/validations";
import { ZodError } from "zod";

/**
 * GET /api/admin/schedules?staffId=...
 * Fetch working schedules for a specific staff member or all staff
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");

    const schedules = await prisma.staffSchedule.findMany({
      where: staffId ? { staffId } : {},
      include: {
        staff: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ staffId: "asc" }, { dayOfWeek: "asc" }],
    });

    return NextResponse.json({
      success: true,
      total: schedules.length,
      data: schedules,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/schedules:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy lịch làm việc." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/schedules
 * Bulk update/upsert work schedules for a staff member
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = updateStaffSchedulesSchema.parse(body);

    const staff = await prisma.staff.findUnique({
      where: { id: validated.staffId },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy nhân viên." },
        { status: 404 }
      );
    }

    // Upsert each schedule day within a transaction
    const updatedSchedules = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of validated.schedules) {
        const schedule = await tx.staffSchedule.upsert({
          where: {
            staffId_dayOfWeek: {
              staffId: validated.staffId,
              dayOfWeek: item.dayOfWeek,
            },
          },
          update: {
            startTime: item.startTime,
            endTime: item.endTime,
            breakStart: item.breakStart || null,
            breakEnd: item.breakEnd || null,
            isWorkingDay: item.isWorkingDay,
          },
          create: {
            staffId: validated.staffId,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            breakStart: item.breakStart || null,
            breakEnd: item.breakEnd || null,
            isWorkingDay: item.isWorkingDay,
          },
        });
        results.push(schedule);
      }
      return results;
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật ca làm việc của nhân viên thành công!",
      data: updatedSchedules,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu ca làm việc không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("Error in PUT /api/admin/schedules:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi cập nhật ca làm việc." },
      { status: 500 }
    );
  }
}
