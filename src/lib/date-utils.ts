import {
  addMinutes,
  format,
  getDay,
  parse,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns";
import { TimeInterval } from "@/types/booking";

/**
 * Parse an ISO date or "YYYY-MM-DD" string into a Date set to start of day (00:00:00)
 */
export function parseDateOnly(input: string | Date): Date {
  if (input instanceof Date) {
    return startOfDay(input);
  }
  // If string contains 'T', parse as ISO date
  if (input.includes("T")) {
    return startOfDay(new Date(input));
  }
  // Otherwise parse as YYYY-MM-DD
  const [year, month, day] = input.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return startOfDay(date);
}

/**
 * Converts a "HH:mm" time string (e.g. "08:30") on a specific reference Date into a Date object.
 */
export function parseTimeString(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return setMilliseconds(
    setSeconds(setMinutes(setHours(startOfDay(baseDate), hours), minutes), 0),
    0
  );
}

/**
 * Formats a Date object to "HH:mm" string (e.g. "09:30")
 */
export function formatTimeString(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * Formats a Date object to "yyyy-MM-dd"
 */
export function formatDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Checks whether two time intervals overlap.
 * Mathematical overlap formula: Start_A < End_B AND End_A > Start_B
 */
export function isOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return isBefore(startA, endB) && isAfter(endA, startB);
}

/**
 * Checks whether an interval [start, end] overlaps with any interval in a list
 */
export function hasOverlapWithAny(
  targetStart: Date,
  targetEnd: Date,
  intervals: TimeInterval[]
): boolean {
  return intervals.some((interval) =>
    isOverlapping(targetStart, targetEnd, interval.start, interval.end)
  );
}

/**
 * Safely adds minutes to a Date
 */
export { addMinutes, getDay, isBefore, isAfter };
