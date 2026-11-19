import defaultPrisma from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { CreateBookingInput } from "@/lib/validations";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import {
  addMinutes,
  getDay,
  isAfter,
  isBefore,
  isOverlapping,
  parseDateOnly,
  parseTimeString,
} from "@/lib/date-utils";
import { endOfDay, startOfDay } from "date-fns";

/**
 * Creates a new booking with ACID Transaction guarantees.
 * Prevents race conditions and double bookings under high concurrency.
 */
export async function createBooking(
  input: CreateBookingInput,
  customPrisma?: PrismaClient
) {
  const db = customPrisma ?? defaultPrisma;

  const startTime = new Date(input.startTime);
  if (isNaN(startTime.getTime())) {
    throw new BadRequestError("Thời gian bắt đầu lịch hẹn không hợp lệ.");
  }

  // Cannot book in the past
  const now = new Date();
  if (isBefore(startTime, now)) {
    throw new BadRequestError("Không thể đặt lịch hẹn ở thời điểm trong quá khứ.");
  }

  const targetDate = parseDateOnly(startTime);
  const dayOfWeek = getDay(targetDate);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  // Execute inside a database transaction to guarantee atomicity and concurrency safety
  return await db.$transaction(async (tx) => {
    // 1. Resolve Business
    const business = input.businessId
      ? await tx.business.findUnique({ where: { id: input.businessId } })
      : await tx.business.findFirst();

    if (!business) {
      throw new NotFoundError("Không tìm thấy thông tin cơ sở dịch vụ.");
    }

    // 2. Resolve Services
    if (!input.serviceIds || input.serviceIds.length === 0) {
      throw new BadRequestError("Vui lòng chọn ít nhất một dịch vụ.");
    }

    const services = await tx.service.findMany({
      where: {
        id: { in: input.serviceIds },
        businessId: business.id,
        isActive: true,
      },
    });

    if (services.length !== input.serviceIds.length) {
      throw new BadRequestError("Một hoặc nhiều dịch vụ đã chọn không khả dụng.");
    }

    const totalDurationMins = services.reduce(
      (sum, s) => sum + s.durationMins,
      0
    );
    const totalBufferMins = services.reduce((sum, s) => sum + s.bufferMins, 0);
    const totalOccupancyMins = totalDurationMins + totalBufferMins;
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    const endTime = addMinutes(startTime, totalDurationMins);
    const occupancyEnd = addMinutes(startTime, totalOccupancyMins);

    // 3. Verify Business Operating Hours
    const businessOpen = parseTimeString(business.openTime, targetDate);
    const businessClose = parseTimeString(business.closeTime, targetDate);

    if (isBefore(startTime, businessOpen)) {
      throw new BadRequestError(
        `Cửa hàng chưa mở cửa lúc này (Giờ mở cửa: ${business.openTime}).`
      );
    }

    if (isAfter(endTime, businessClose)) {
      throw new BadRequestError(
        `Thời gian dịch vụ kết thúc vượt quá giờ đóng cửa của cửa hàng (${business.closeTime}).`
      );
    }

    // 4. Resolve & Lock Staff Availability
    let selectedStaffId: string;

    if (input.staffId) {
      // Specific staff requested
      const staff = await tx.staff.findFirst({
        where: {
          id: input.staffId,
          businessId: business.id,
          isActive: true,
        },
        include: {
          schedules: {
            where: { dayOfWeek },
          },
          timeOffs: {
            where: {
              startDateTime: { lte: occupancyEnd },
              endDateTime: { gte: startTime },
            },
          },
          bookings: {
            where: {
              status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
              startTime: { lte: dayEnd },
              endTime: { gte: dayStart },
            },
            include: {
              bookingServices: {
                include: { service: true },
              },
            },
          },
        },
      });

      if (!staff) {
        throw new NotFoundError("Nhân viên được chọn không tồn tại hoặc đã nghỉ.");
      }

      const schedule = staff.schedules[0] || null;
      if (!schedule || !schedule.isWorkingDay) {
        throw new ConflictError(`Nhân viên ${staff.name} không làm việc vào ngày này.`);
      }

      const shiftStart = parseTimeString(schedule.startTime, targetDate);
      const shiftEnd = parseTimeString(schedule.endTime, targetDate);

      if (isBefore(startTime, shiftStart) || isAfter(endTime, shiftEnd)) {
        throw new ConflictError(
          `Khung giờ này nằm ngoài ca trực của nhân viên ${staff.name} (${schedule.startTime} - ${schedule.endTime}).`
        );
      }

      // Check lunch / break overlap
      if (schedule.breakStart && schedule.breakEnd) {
        const breakStart = parseTimeString(schedule.breakStart, targetDate);
        const breakEnd = parseTimeString(schedule.breakEnd, targetDate);
        if (isOverlapping(startTime, occupancyEnd, breakStart, breakEnd)) {
          throw new ConflictError(
            `Nhân viên ${staff.name} đang trong giờ nghỉ trưa (${schedule.breakStart} - ${schedule.breakEnd}).`
          );
        }
      }

      // Check time-offs
      if (staff.timeOffs.length > 0) {
        throw new ConflictError(
          `Nhân viên ${staff.name} đã xin nghỉ phép trong khung giờ này.`
        );
      }

      // Check overlapping active bookings
      const hasBookingOverlap = staff.bookings.some((b) => {
        const bookingBuffer = b.bookingServices.reduce(
          (sum, bs) => sum + (bs.service?.bufferMins || 0),
          0
        );
        const bOccupancyEnd = addMinutes(b.endTime, bookingBuffer);
        return isOverlapping(startTime, occupancyEnd, b.startTime, bOccupancyEnd);
      });

      if (hasBookingOverlap) {
        throw new ConflictError(
          `Khung giờ này của nhân viên ${staff.name} vừa có khách khác đặt trước. Vui lòng chọn khung giờ khác!`
        );
      }

      selectedStaffId = staff.id;
    } else {
      // Auto-assign: Find all available staff for this slot
      const allStaff = await tx.staff.findMany({
        where: {
          businessId: business.id,
          isActive: true,
        },
        include: {
          schedules: {
            where: { dayOfWeek },
          },
          timeOffs: {
            where: {
              startDateTime: { lte: occupancyEnd },
              endDateTime: { gte: startTime },
            },
          },
          bookings: {
            where: {
              status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
              startTime: { lte: dayEnd },
              endTime: { gte: dayStart },
            },
            include: {
              bookingServices: {
                include: { service: true },
              },
            },
          },
        },
      });

      const eligibleStaff: Array<{ staff: typeof allStaff[0]; bookingCount: number }> = [];

      for (const st of allStaff) {
        const schedule = st.schedules[0] || null;
        if (!schedule || !schedule.isWorkingDay) continue;

        const shiftStart = parseTimeString(schedule.startTime, targetDate);
        const shiftEnd = parseTimeString(schedule.endTime, targetDate);

        if (isBefore(startTime, shiftStart) || isAfter(endTime, shiftEnd)) {
          continue;
        }

        // Break time
        if (schedule.breakStart && schedule.breakEnd) {
          const breakStart = parseTimeString(schedule.breakStart, targetDate);
          const breakEnd = parseTimeString(schedule.breakEnd, targetDate);
          if (isOverlapping(startTime, occupancyEnd, breakStart, breakEnd)) {
            continue;
          }
        }

        // Time off
        if (st.timeOffs.length > 0) continue;

        // Existing booking overlap
        const hasOverlap = st.bookings.some((b) => {
          const bookingBuffer = b.bookingServices.reduce(
            (sum, bs) => sum + (bs.service?.bufferMins || 0),
            0
          );
          const bOccupancyEnd = addMinutes(b.endTime, bookingBuffer);
          return isOverlapping(startTime, occupancyEnd, b.startTime, bOccupancyEnd);
        });

        if (hasOverlap) continue;

        eligibleStaff.push({
          staff: st,
          bookingCount: st.bookings.length,
        });
      }

      if (eligibleStaff.length === 0) {
        throw new ConflictError(
          "Hiện không còn nhân viên nào còn trống trong khung giờ này. Vui lòng chọn khung giờ khác!"
        );
      }

      // Load-balancing: Prioritize the staff member with the fewest bookings on this day
      eligibleStaff.sort((a, b) => a.bookingCount - b.bookingCount);
      selectedStaffId = eligibleStaff[0].staff.id;
    }

    // 5. Create Booking & BookingService records atomically
    const booking = await tx.booking.create({
      data: {
        businessId: business.id,
        staffId: selectedStaffId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        customerNote: input.customerNote?.trim() || null,
        startTime,
        endTime,
        totalDurationMins,
        totalPrice,
        status: "CONFIRMED",
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
          include: {
            service: true,
          },
        },
      },
    });

    return booking;
  });
}
