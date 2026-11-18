export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface TimeSlotStaff {
  id: string;
  name: string;
  avatar?: string | null;
  role?: string;
}

export interface AvailableSlot {
  /** "HH:mm" e.g. "09:00" */
  time: string;
  /** ISO Date String for appointment start */
  startTime: string;
  /** ISO Date String for appointment end (without buffer) */
  endTime: string;
  /** Total service duration in minutes */
  durationMins: number;
  /** Total cleanup / rest buffer in minutes */
  bufferMins: number;
  /** List of staff who can take this slot */
  availableStaff: TimeSlotStaff[];
}

export interface AvailabilityQuery {
  /** Date in "YYYY-MM-DD" or Date object */
  date: string | Date;
  /** Array of service IDs selected by the customer */
  serviceIds: string[];
  /** Optional specific staff member requested */
  staffId?: string;
  /** Optional business ID (defaults to primary business if only 1 exists) */
  businessId?: string;
}

export interface AvailabilityResult {
  date: string;
  businessId: string;
  slotInterval: number;
  totalDurationMins: number;
  totalBufferMins: number;
  totalPrice: number;
  slots: AvailableSlot[];
}

export interface TimeInterval {
  start: Date;
  end: Date;
}
