import { endOfDay, startOfDay } from "date-fns";
import defaultPrisma from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import {
  AvailabilityQuery,
  AvailabilityResult,
  AvailableSlot,
  TimeInterval,
  TimeSlotStaff,
} from "@/types/booking";
import {
  addMinutes,
  formatDateString,
  formatTimeString,
  getDay,
  isAfter,
  isBefore,
  isOverlapping,
  parseDateOnly,
  parseTimeString,
} from "@/lib/date-utils";

/**
 * Core Slot Availability Engine
 *
 * Calculates all valid booking slots for a requested date, combination of services,
 * and optional requested staff member.
 *
 * Adheres strictly to:
 * 1. Store operating hours (openTime -> closeTime)
 * 2. Staff work shift (startTime -> endTime) & working days
 * 3. Staff break intervals (e.g. 12:00 -> 13:00)
 * 4. Staff approved time-offs
 * 5. Active existing appointments (PENDING, CONFIRMED, CHECKED_IN)
 * 6. Buffer time (rest / sanitation) between appointments
 * 7. Past slots elimination for current date
 */
export async function getAvailableSlots(
  query: AvailabilityQuery,
  customPrisma?: PrismaClient
): Promise<AvailabilityResult> {
  const db = customPrisma ?? defaultPrisma;

  // 1. Normalize and parse target date
  const targetDate = parseDateOnly(query.date);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  const dayOfWeek = getDay(targetDate); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // 2. Resolve Business
  const business = query.businessId
    ? await db.business.findUnique({ where: { id: query.businessId } })
    : await db.business.findFirst();

  if (!business) {
    throw new Error("Không tìm thấy thông tin cửa hàng / cơ sở dịch vụ.");
  }

  // 3. Resolve & validate Services
  if (!query.serviceIds || query.serviceIds.length === 0) {
    return {
      date: formatDateString(targetDate),
      businessId: business.id,
      slotInterval: business.slotInterval,
      totalDurationMins: 0,
      totalBufferMins: 0,
      totalPrice: 0,
      slots: [],
    };
  }

  const services = await db.service.findMany({
    where: {
      id: { in: query.serviceIds },
      businessId: business.id,
      isActive: true,
    },
  });

  if (services.length !== query.serviceIds.length) {
    throw new Error(
      "Một hoặc nhiều dịch vụ được chọn không tồn tại hoặc đã ngừng hoạt động."
    );
  }

  const totalDurationMins = services.reduce(
    (acc, s) => acc + s.durationMins,
    0
  );
  const totalBufferMins = services.reduce((acc, s) => acc + s.bufferMins, 0);
  const totalOccupancyMins = totalDurationMins + totalBufferMins;
  const totalPrice = services.reduce((acc, s) => acc + s.price, 0);

  // 4. Fetch candidate staff with day's schedule, time-offs, and active bookings
  const staffFilter: {
    businessId: string;
    isActive: boolean;
    id?: string;
  } = {
    businessId: business.id,
    isActive: true,
  };

  if (query.staffId) {
    staffFilter.id = query.staffId;
  }

  const staffMembers = await db.staff.findMany({
    where: staffFilter,
    include: {
      schedules: {
        where: { dayOfWeek },
      },
      timeOffs: {
        where: {
          startDateTime: { lte: dayEnd },
          endDateTime: { gte: dayStart },
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
            include: {
              service: true,
            },
          },
        },
      },
    },
  });

  // 5. Pre-process staff busy intervals for high-performance evaluation
  const staffEvaluators = staffMembers.map((staff) => {
    const schedule = staff.schedules[0] || null;
    const isWorkingDay = schedule ? schedule.isWorkingDay : false;

    // Shift boundaries
    const shiftStart =
      schedule && isWorkingDay
        ? parseTimeString(schedule.startTime, targetDate)
        : null;
    const shiftEnd =
      schedule && isWorkingDay
        ? parseTimeString(schedule.endTime, targetDate)
        : null;

    // Break interval
    const breakInterval: TimeInterval | null =
      schedule && schedule.breakStart && schedule.breakEnd && isWorkingDay
        ? {
            start: parseTimeString(schedule.breakStart, targetDate),
            end: parseTimeString(schedule.breakEnd, targetDate),
          }
        : null;

    // Time-off intervals
    const timeOffIntervals: TimeInterval[] = staff.timeOffs.map((to) => ({
      start: to.startDateTime,
      end: to.endDateTime,
    }));

    // Existing booking occupancy intervals (Appointment Duration + Service Buffer)
    const bookingOccupancyIntervals: TimeInterval[] = staff.bookings.map(
      (b) => {
        const bookingBuffer = b.bookingServices.reduce(
          (sum, bs) => sum + (bs.service?.bufferMins || 0),
          0
        );
        return {
          start: b.startTime,
          end: addMinutes(b.endTime, bookingBuffer),
        };
      }
    );

    return {
      staffInfo: {
        id: staff.id,
        name: staff.name,
        avatar: staff.avatar,
        role: staff.role,
      } as TimeSlotStaff,
      isWorkingDay,
      shiftStart,
      shiftEnd,
      breakInterval,
      timeOffIntervals,
      bookingOccupancyIntervals,
    };
  });

  // 6. Generate candidate slots across store operating hours
  const businessOpen = parseTimeString(business.openTime, targetDate);
  const businessClose = parseTimeString(business.closeTime, targetDate);
  const slotInterval = business.slotInterval || 30;

  const now = new Date();
  const slots: AvailableSlot[] = [];

  let candidateStart = businessOpen;

  while (isBefore(candidateStart, businessClose)) {
    const candidateServiceEnd = addMinutes(candidateStart, totalDurationMins);
    const candidateOccupancyEnd = addMinutes(candidateStart, totalOccupancyMins);

    // Rule 1: The appointment must end on or before the business closing time
    if (isAfter(candidateServiceEnd, businessClose)) {
      break;
    }

    // Rule 2: Cannot book slots in the past (with a 5-minute grace period if needed)
    if (isBefore(candidateStart, now)) {
      candidateStart = addMinutes(candidateStart, slotInterval);
      continue;
    }

    // Rule 3: Evaluate which staff are available for this slot
    const availableStaff: TimeSlotStaff[] = [];

    for (const evaluator of staffEvaluators) {
      // Must be working today
      if (!evaluator.isWorkingDay || !evaluator.shiftStart || !evaluator.shiftEnd) {
        continue;
      }

      // Must fit entirely within the staff's shift
      if (
        isBefore(candidateStart, evaluator.shiftStart) ||
        isAfter(candidateServiceEnd, evaluator.shiftEnd)
      ) {
        continue;
      }

      // Must not collide with lunch / break time
      if (
        evaluator.breakInterval &&
        isOverlapping(
          candidateStart,
          candidateOccupancyEnd,
          evaluator.breakInterval.start,
          evaluator.breakInterval.end
        )
      ) {
        continue;
      }

      // Must not collide with approved time-offs
      const collidesWithTimeOff = evaluator.timeOffIntervals.some((to) =>
        isOverlapping(candidateStart, candidateOccupancyEnd, to.start, to.end)
      );
      if (collidesWithTimeOff) {
        continue;
      }

      // Must not collide with existing active bookings (including buffers)
      const collidesWithBooking = evaluator.bookingOccupancyIntervals.some(
        (bInterval) =>
          isOverlapping(
            candidateStart,
            candidateOccupancyEnd,
            bInterval.start,
            bInterval.end
          )
      );
      if (collidesWithBooking) {
        continue;
      }

      // Passed all checks!
      availableStaff.push(evaluator.staffInfo);
    }

    // If at least one staff is available, this slot is bookable!
    if (availableStaff.length > 0) {
      slots.push({
        time: formatTimeString(candidateStart),
        startTime: candidateStart.toISOString(),
        endTime: candidateServiceEnd.toISOString(),
        durationMins: totalDurationMins,
        bufferMins: totalBufferMins,
        availableStaff,
      });
    }

    candidateStart = addMinutes(candidateStart, slotInterval);
  }

  return {
    date: formatDateString(targetDate),
    businessId: business.id,
    slotInterval,
    totalDurationMins,
    totalBufferMins,
    totalPrice,
    slots,
  };
}
