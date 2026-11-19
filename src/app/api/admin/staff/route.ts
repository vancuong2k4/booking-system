import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createStaffSchema } from "@/lib/validations";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/staff
 * List all staff members with their schedules
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const business = await prisma.business.findFirst();
    if (!business) {
      return NextResponse.json({ success: true, data: [] });
    }

    const staffMembers = await prisma.staff.findMany({
      where: {
        businessId: business.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        schedules: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      total: staffMembers.length,
      data: staffMembers,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/staff:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy danh sách nhân viên." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/staff
 * Create a new staff member with a default 7-day work schedule
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createStaffSchema.parse(body);

    const business = validated.businessId
      ? await prisma.business.findUnique({ where: { id: validated.businessId } })
      : await prisma.business.findFirst();

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy cơ sở dịch vụ." },
        { status: 404 }
      );
    }

    // Create staff member and their 7-day default schedules inside a transaction
    const newStaff = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          businessId: business.id,
          name: validated.name.trim(),
          phone: validated.phone.trim(),
          role: validated.role.trim(),
          avatar: validated.avatar || null,
          isActive: validated.isActive,
        },
      });

      // Default schedules: Mon-Sat working (08:30 - 18:00, break 12:00-13:00), Sun off
      const defaultSchedules = [];
      for (let day = 0; day <= 6; day++) {
        const isWorking = day !== 0; // Sunday off
        defaultSchedules.push({
          staffId: staff.id,
          dayOfWeek: day,
          startTime: business.openTime || "08:30",
          endTime: business.closeTime || "18:00",
          breakStart: "12:00",
          breakEnd: "13:00",
          isWorkingDay: isWorking,
        });
      }

      for (const s of defaultSchedules) {
        await tx.staffSchedule.create({ data: s });
      }

      return tx.staff.findUnique({
        where: { id: staff.id },
        include: { schedules: { orderBy: { dayOfWeek: "asc" } } },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thêm nhân viên mới và khởi tạo lịch làm việc thành công!",
        data: newStaff,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu nhân viên không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/admin/staff:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi thêm nhân viên." },
      { status: 500 }
    );
  }
}
