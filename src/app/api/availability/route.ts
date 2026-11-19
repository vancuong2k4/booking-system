import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { availabilityQuerySchema } from "@/lib/validations";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability
 * Query available booking time slots by date, selected service IDs, and optional staffId
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const serviceIdsParam = searchParams.get("serviceIds");
    const staffId = searchParams.get("staffId") || undefined;
    const businessId = searchParams.get("businessId") || undefined;

    const validated = availabilityQuerySchema.parse({
      date,
      serviceIds: serviceIdsParam ? serviceIdsParam.split(",") : [],
      staffId,
      businessId,
    });

    const result = await getAvailableSlots({
      date: validated.date,
      serviceIds: validated.serviceIds as string[],
      staffId: validated.staffId,
      businessId: validated.businessId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Tham số truy vấn khung giờ không hợp lệ.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Lỗi tính toán khung giờ trống.";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 400 }
    );
  }
}
