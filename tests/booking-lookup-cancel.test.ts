import prisma from "../src/lib/prisma";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { GET as getBookingById, PATCH as patchBookingById } from "../src/app/api/bookings/[id]/route";
import { GET as getBookings } from "../src/app/api/bookings/route";
import { NextRequest } from "next/server";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     ↳ ${detail}`);
    failedCount++;
  }
}

async function runLookupAndCancelTests() {
  console.log("========================================================================");
  console.log("🧪 BẮT ĐẦU CHẠY TEST: TRA CỨU & HỦY LỊCH HẸN KHÁCH HÀNG (TASK 3.2)");
  console.log("========================================================================\n");

  const business = await prisma.business.findFirst();
  const staff = await prisma.staff.findFirst();
  const service = await prisma.service.findFirst();

  if (!business || !staff || !service) {
    throw new Error("Chưa seed dữ liệu business, staff hoặc service!");
  }

  // Tạo một booking mẫu để test
  const targetDay = addDays(new Date(), 3);
  const startTime = setMilliseconds(setSeconds(setMinutes(setHours(targetDay, 10), 0), 0), 0);
  const endTime = setMilliseconds(setSeconds(setMinutes(setHours(targetDay, 10), 45), 0), 0);

  const testPhone = "0987654321";
  const testCustomer = "Nguyễn Văn Test Tra Cứu";

  const booking = await prisma.booking.create({
    data: {
      businessId: business.id,
      staffId: staff.id,
      customerName: testCustomer,
      customerPhone: testPhone,
      customerNote: "Test tra cứu & hủy lịch",
      startTime,
      endTime,
      totalDurationMins: 45,
      totalPrice: service.price,
      status: "CONFIRMED",
      bookingServices: {
        create: {
          serviceId: service.id,
          priceAtBooking: service.price,
          durationAtBooking: 45,
        },
      },
    },
    include: {
      bookingServices: {
        include: { service: true },
      },
    },
  });

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Tra cứu lịch hẹn theo ID (GET /api/bookings/[id])
  // -------------------------------------------------------------------------
  console.log("📌 TEST SUITE 1: Tra cứu chi tiết lịch hẹn theo Booking ID");

  const reqGet = new NextRequest(`http://localhost:3000/api/bookings/${booking.id}`);
  const resGet = await getBookingById(reqGet, { params: Promise.resolve({ id: booking.id }) });
  const jsonGet = await resGet.json();

  assert(resGet.status === 200, "API trả về HTTP status 200");
  assert(jsonGet.success === true, "Response payload có success: true");
  assert(jsonGet.data.id === booking.id, "Mã lịch hẹn khớp chính xác");
  assert(jsonGet.data.customerPhone === testPhone, "Số điện thoại khách hàng khớp chính xác");
  assert(jsonGet.data.bookingServices.length > 0, "Dữ liệu bao gồm danh sách bookingServices");

  // Tra cứu ID không tồn tại
  const reqNotFound = new NextRequest("http://localhost:3000/api/bookings/non-existent-id");
  const resNotFound = await getBookingById(reqNotFound, { params: Promise.resolve({ id: "non-existent-id" }) });
  assert(resNotFound.status === 404, "Trả về 404 khi ID không tồn tại");

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Tra cứu danh sách theo SĐT (GET /api/bookings?phone=...)
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST SUITE 2: Tra cứu danh sách lịch hẹn theo Số điện thoại");

  const reqSearchPhone = new NextRequest(`http://localhost:3000/api/bookings?phone=${testPhone}`);
  const resSearchPhone = await getBookings(reqSearchPhone);
  const jsonSearchPhone = await resSearchPhone.json();

  assert(resSearchPhone.status === 200, "Tra cứu theo SĐT trả về HTTP 200");
  assert(jsonSearchPhone.success === true, "Tra cứu theo SĐT thành công");
  assert(Array.isArray(jsonSearchPhone.data), "Kết quả là một mảng danh sách lịch");
  assert(jsonSearchPhone.data.some((b: { id: string }) => b.id === booking.id), "Tìm thấy lịch hẹn vừa tạo theo SĐT");

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Hủy lịch hẹn khách hàng (PATCH /api/bookings/[id])
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST SUITE 3: Quy tắc hủy lịch hẹn khách hàng (Customer Cancel)");

  // 3.1 Sai số điện thoại xác thực
  const reqWrongPhone = new NextRequest(`http://localhost:3000/api/bookings/${booking.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel", customerPhone: "0999999999" }),
  });
  const resWrongPhone = await patchBookingById(reqWrongPhone, { params: Promise.resolve({ id: booking.id }) });
  assert(resWrongPhone.status === 403, "Chặn hủy khi SĐT xác thực không khớp (HTTP 403)");

  // 3.2 Đúng SĐT xác thực và lịch ở trạng thái CONFIRMED
  const reqCancelValid = new NextRequest(`http://localhost:3000/api/bookings/${booking.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel", customerPhone: testPhone }),
  });
  const resCancelValid = await patchBookingById(reqCancelValid, { params: Promise.resolve({ id: booking.id }) });
  const jsonCancelValid = await resCancelValid.json();

  assert(resCancelValid.status === 200, "Hủy lịch thành công với đúng SĐT (HTTP 200)");
  assert(jsonCancelValid.data.status === "CANCELLED", "Trạng thái lịch được cập nhật thành CANCELLED");

  // 3.3 Thử hủy lại lịch đã bị CANCELLED
  const reqReCancel = new NextRequest(`http://localhost:3000/api/bookings/${booking.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel", customerPhone: testPhone }),
  });
  const resReCancel = await patchBookingById(reqReCancel, { params: Promise.resolve({ id: booking.id }) });
  assert(resReCancel.status === 409, "Không cho phép hủy lịch đã ở trạng thái CANCELLED (HTTP 409)");

  // Dọn dẹp dữ liệu test
  await prisma.bookingService.deleteMany({ where: { bookingId: booking.id } });
  await prisma.booking.delete({ where: { id: booking.id } });

  console.log("\n========================================================================");
  console.log(`📊 KẾT QUẢ TEST: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLookupAndCancelTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
