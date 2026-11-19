import { z } from "zod";

// Regex for Vietnamese phone numbers (10 digits starting with 03, 05, 07, 08, 09 or general 9-11 digits)
export const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

// ---------------------------------------------------------------------------
// CLIENT BOOKING & AVAILABILITY SCHEMAS
// ---------------------------------------------------------------------------
export const createBookingSchema = z.object({
  customerName: z
    .string()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được vượt quá 100 ký tự"),
  customerPhone: z
    .string()
    .regex(phoneRegex, "Số điện thoại không hợp lệ (VD: 0901234567)"),
  customerNote: z.string().max(500, "Ghi chú không được quá 500 ký tự").optional(),
  serviceIds: z
    .array(z.string().min(1, "Service ID không được rỗng"))
    .min(1, "Vui lòng chọn ít nhất 1 dịch vụ"),
  staffId: z.string().optional().nullable(),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Thời gian bắt đầu không hợp lệ (định dạng ISO)"),
  businessId: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)) || /^\d{4}-\d{2}-\d{2}$/.test(val), "Ngày không hợp lệ (YYYY-MM-DD)"),
  serviceIds: z
    .array(z.string())
    .or(z.string().transform((val) => val.split(",").map((s) => s.trim()).filter(Boolean)))
    .refine((arr) => arr.length > 0, "Vui lòng chọn ít nhất 1 dịch vụ"),
  staffId: z.string().optional(),
  businessId: z.string().optional(),
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

export const updateBookingStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]),
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

// ---------------------------------------------------------------------------
// ADMIN SCHEMAS: SERVICES, STAFF, SCHEDULES & WALK-IN
// ---------------------------------------------------------------------------

export const createServiceSchema = z.object({
  name: z.string().min(2, "Tên dịch vụ phải có ít nhất 2 ký tự").max(150),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0, "Giá dịch vụ không được âm"),
  durationMins: z.number().int().min(5, "Thời lượng tối thiểu là 5 phút"),
  bufferMins: z.number().int().min(0, "Thời gian đệm không được âm").default(0),
  isActive: z.boolean().default(true),
  businessId: z.string().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const createStaffSchema = z.object({
  name: z.string().min(2, "Tên nhân viên phải có ít nhất 2 ký tự").max(100),
  phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  role: z.string().default("Stylist"),
  avatar: z.string().url("Avatar phải là URL hợp lệ").optional().nullable(),
  isActive: z.boolean().default(true),
  businessId: z.string().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema.partial();
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Giờ bắt đầu định dạng HH:mm"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Giờ kết thúc định dạng HH:mm"),
  breakStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Giờ nghỉ trưa định dạng HH:mm").optional().nullable(),
  breakEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hết nghỉ trưa định dạng HH:mm").optional().nullable(),
  isWorkingDay: z.boolean().default(true),
});

export const updateStaffSchedulesSchema = z.object({
  staffId: z.string().min(1, "Staff ID không được để trống"),
  schedules: z.array(scheduleItemSchema).min(1, "Cần cung cấp ít nhất 1 ca làm việc"),
});

export type UpdateStaffSchedulesInput = z.infer<typeof updateStaffSchedulesSchema>;

export const walkInBookingSchema = z.object({
  customerName: z.string().default("Khách vãng lai"),
  customerPhone: z.string().optional().default("0000000000"),
  customerNote: z.string().optional().default("Khách trực tiếp tại quầy"),
  staffId: z.string().min(1, "Vui lòng chọn nhân viên phục vụ"),
  serviceIds: z.array(z.string().min(1)).min(1, "Vui lòng chọn ít nhất 1 dịch vụ"),
  startTime: z.string().optional(), // If omitted, defaults to now
  businessId: z.string().optional(),
});

export type WalkInBookingInput = z.infer<typeof walkInBookingSchema>;
