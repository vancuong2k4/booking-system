import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateStaffSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/staff/[id]
 * Get staff profile details with schedules and upcoming appointments
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        schedules: { orderBy: { dayOfWeek: "asc" } },
        timeOffs: { orderBy: { startDateTime: "desc" }, take: 10 },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy nhân viên." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error("Error in GET /api/admin/staff/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi lấy thông tin nhân viên." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/staff/[id]
 * Update staff profile
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateStaffSchema.parse(body);

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy nhân viên để cập nhật." },
        { status: 404 }
      );
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name.trim() }),
        ...(validated.phone !== undefined && { phone: validated.phone.trim() }),
        ...(validated.role !== undefined && { role: validated.role.trim() }),
        ...(validated.avatar !== undefined && { avatar: validated.avatar }),
        ...(validated.isActive !== undefined && {
          isActive: validated.isActive,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin nhân viên thành công!",
      data: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu cập nhật nhân viên không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("Error in PUT /api/admin/staff/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi cập nhật nhân viên." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/staff/[id]
 * Soft-delete or deactivate staff
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.staff.findUnique({
      where: { id },
      include: { bookings: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy nhân viên để xóa." },
        { status: 404 }
      );
    }

    // If staff has booking history, deactivate to preserve data integrity
    if (existing.bookings.length > 0) {
      const deactivated = await prisma.staff.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: "Nhân viên đã có lịch sử ca trực nên được chuyển sang trạng thái ngưng hoạt động.",
        data: deactivated,
      });
    }

    // If no booking history, safe to delete completely
    await prisma.staff.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Đã xóa nhân viên thành công!",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/staff/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xóa nhân viên." },
      { status: 500 }
    );
  }
}
