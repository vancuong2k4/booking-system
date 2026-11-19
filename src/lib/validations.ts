import { z } from "zod";

// Regex for Vietnamese phone numbers (10 digits starting with 03, 05, 07, 08, 09 or general 9-11 digits)
export const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

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
