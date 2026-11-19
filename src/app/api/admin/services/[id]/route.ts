import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateServiceSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/services/[id]
 * Get service details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy dịch vụ." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error("Error in GET /api/admin/services/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi lấy thông tin dịch vụ." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/services/[id]
 * Update service details
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateServiceSchema.parse(body);

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy dịch vụ để cập nhật." },
        { status: 404 }
      );
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name.trim() }),
        ...(validated.description !== undefined && {
          description: validated.description?.trim() || null,
        }),
        ...(validated.price !== undefined && { price: validated.price }),
        ...(validated.durationMins !== undefined && {
          durationMins: validated.durationMins,
        }),
        ...(validated.bufferMins !== undefined && {
          bufferMins: validated.bufferMins,
        }),
        ...(validated.isActive !== undefined && {
          isActive: validated.isActive,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật dịch vụ thành công!",
      data: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu cập nhật không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("Error in PUT /api/admin/services/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi cập nhật dịch vụ." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/services/[id]
 * Soft-delete or deactivate a service
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.service.findUnique({
      where: { id },
      include: { bookingServices: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy dịch vụ để xóa." },
        { status: 404 }
      );
    }

    // If service has booking history, deactivate it (soft-delete) to preserve integrity
    if (existing.bookingServices.length > 0) {
      const deactivated = await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: "Dịch vụ đã có lịch sử đặt lịch nên đã được chuyển sang trạng thái ngưng hoạt động.",
        data: deactivated,
      });
    }

    // If no booking history, safe to delete completely
    await prisma.service.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Đã xóa dịch vụ thành công!",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/services/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xóa dịch vụ." },
      { status: 500 }
    );
  }
}
