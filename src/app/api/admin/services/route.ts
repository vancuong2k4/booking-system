import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createServiceSchema } from "@/lib/validations";
import { ZodError } from "zod";

/**
 * GET /api/admin/services
 * List all services for administration
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const business = await prisma.business.findFirst();
    if (!business) {
      return NextResponse.json({ success: true, data: [] });
    }

    const services = await prisma.service.findMany({
      where: {
        businessId: business.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      total: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/services:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy danh sách dịch vụ." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/services
 * Create a new service
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createServiceSchema.parse(body);

    const business = validated.businessId
      ? await prisma.business.findUnique({ where: { id: validated.businessId } })
      : await prisma.business.findFirst();

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy cơ sở dịch vụ." },
        { status: 404 }
      );
    }

    const service = await prisma.service.create({
      data: {
        businessId: business.id,
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        price: validated.price,
        durationMins: validated.durationMins,
        bufferMins: validated.bufferMins,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tạo dịch vụ mới thành công!",
        data: service,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu dịch vụ không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/admin/services:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi tạo dịch vụ mới." },
      { status: 500 }
    );
  }
}
