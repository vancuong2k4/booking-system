import { createBooking } from "../src/lib/booking-service";
import { ConflictError, BadRequestError } from "../src/lib/errors";
import prisma from "../src/lib/prisma";
import { addDays, format, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

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

async function runBookingConcurrencyTests() {
  console.log("========================================================================");
  console.log("🧪 BẮT ĐẦU CHẠY TEST: BOOKING TRANSACTION & CHỐNG RACE CONDITION (TASK 2.2)");
  console.log("========================================================================\n");

  const business = await prisma.business.findFirst();
  if (!business) throw new Error("Chưa seed dữ liệu business!");

  const services = await prisma.service.findMany({
    where: { businessId: business.id, isActive: true },
  });

  const staffList = await prisma.staff.findMany({
    where: { businessId: business.id, isActive: true },
  });

  const haircut = services.find((s) => s.durationMins === 45)!;
  const spa = services.find((s) => s.durationMins === 60)!;
  const hoangAnh = staffList.find((s) => s.name === "Hoàng Anh")!;

  // Chọn ngày trong tương lai (10 ngày sau) vào ngày Hoàng Anh đi làm (Thứ 2 đến Thứ 7)
  let testDate = addDays(new Date(), 10);
  while (testDate.getDay() === 0) {
    testDate = addDays(testDate, 1);
  }

  const slotTime1 = setMilliseconds(setSeconds(setMinutes(setHours(testDate, 9), 0), 0), 0);
  const slotTime1Str = slotTime1.toISOString();

  // -------------------------------------------------------------------------
  // TEST CASE 1: Đặt lịch thành công với đầy đủ thông tin
  // -------------------------------------------------------------------------
  console.log("📌 TEST 1: Đặt lịch hẹn hợp lệ với 1 dịch vụ chỉ định thợ");
  const b1 = await createBooking({
    customerName: "Nguyễn Văn A",
    customerPhone: "0901234567",
    customerNote: "Cắt sát 2 bên",
    serviceIds: [haircut.id],
    staffId: hoangAnh.id,
    startTime: slotTime1Str,
  });

  assert(b1.id !== undefined, "Tạo đơn đặt lịch thành công với ID hợp lệ");
  assert(b1.status === "CONFIRMED", "Trạng thái mặc định là CONFIRMED");
  assert(b1.totalPrice === haircut.price, `Tổng tiền khớp giá dịch vụ (${b1.totalPrice} VND)`);
  assert(b1.totalDurationMins === 45, "Tổng thời gian khớp 45 phút");
  assert(b1.bookingServices.length === 1, "Bảng trung gian BookingService được tạo snapshot");

  // -------------------------------------------------------------------------
  // TEST CASE 2: Chặn đặt trùng lịch ngay sau khi slot đã được đặt
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST 2: Chặn đặt trùng vào slot vừa được tạo");
  try {
    await createBooking({
      customerName: "Trần Văn B",
      customerPhone: "0912345678",
      serviceIds: [haircut.id],
      staffId: hoangAnh.id,
      startTime: slotTime1Str, // Trùng slotTime1
    });
    assert(false, "Phải ném ConflictError khi đặt trùng slot");
  } catch (err: unknown) {
    const isConflict = err instanceof ConflictError;
    assert(isConflict, "Bắt được ConflictError khi cố tình đặt trùng slot đã có khách");
  }

  // -------------------------------------------------------------------------
  // TEST CASE 3: Chặn đặt trong khoảng thời gian Buffer của thợ
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST 3: Chặn đặt trong thời gian Buffer nghỉ ngơi của thợ");
  // b1: 09:00 - 09:45, buffer 15m -> Thợ bận đến 10:00
  // Khách mới muốn đặt lúc 09:45 -> PHẢI BỊ CHẶN
  const slotTimeBuffer = setMilliseconds(setSeconds(setMinutes(setHours(testDate, 9), 45), 0), 0);
  try {
    await createBooking({
      customerName: "Lê Văn C",
      customerPhone: "0987654321",
      serviceIds: [haircut.id],
      staffId: hoangAnh.id,
      startTime: slotTimeBuffer.toISOString(),
    });
    assert(false, "Phải ném ConflictError khi đặt vào thời gian Buffer");
  } catch (err: unknown) {
    assert(err instanceof ConflictError, "Bắt được ConflictError do dính thời gian Buffer dọn dẹp");
  }

  // -------------------------------------------------------------------------
  // TEST CASE 4: Tự động sắp xếp nhân viên ("Bất kỳ ai còn trống")
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST 4: Tự động xếp thợ khi khách không chọn thợ");
  // Vào lúc 14:00 cả Hoàng Anh (08:30-18:30) và Quốc Bảo (10:00-20:00) đều đang trực ca
  // Ta đặt trước 1 lịch cho Hoàng Anh lúc 14:00
  const slotTime14 = setMilliseconds(setSeconds(setMinutes(setHours(testDate, 14), 0), 0), 0);
  const bHoangAnh14 = await createBooking({
    customerName: "Khách 14h của Hoàng Anh",
    customerPhone: "0933111222",
    serviceIds: [haircut.id],
    staffId: hoangAnh.id,
    startTime: slotTime14.toISOString(),
  });

  // Giờ khách mới đặt lịch lúc 14:00 và chọn "Bất kỳ ai còn trống"
  const bAuto = await createBooking({
    customerName: "Phạm Thị D",
    customerPhone: "0933444555",
    serviceIds: [haircut.id],
    // Không truyền staffId
    startTime: slotTime14.toISOString(),
  });

  assert(bAuto.id !== undefined, "Đặt lịch tự động xếp thợ thành công");
  assert(
    bAuto.staffId !== hoangAnh.id,
    `Hoàng Anh bận thì hệ thống tự động gán cho thợ rảnh khác (Đã gán cho: ${bAuto.staff?.name})`
  );

  // -------------------------------------------------------------------------
  // TEST CASE 5: Chặn đặt lịch trong giờ nghỉ trưa
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST 5: Chặn đặt lịch rơi vào giờ nghỉ trưa");
  const slotLunch = setMilliseconds(setSeconds(setMinutes(setHours(testDate, 12), 0), 0), 0);
  try {
    await createBooking({
      customerName: "Hoàng Văn E",
      customerPhone: "0944555666",
      serviceIds: [haircut.id],
      staffId: hoangAnh.id,
      startTime: slotLunch.toISOString(),
    });
    assert(false, "Phải ném ConflictError khi đặt vào giờ nghỉ trưa");
  } catch (err: unknown) {
    assert(err instanceof ConflictError, "Chặn thành công lịch đặt vào giờ nghỉ trưa (12:00 - 13:00)");
  }

  // -------------------------------------------------------------------------
  // TEST CASE 6: CHỐNG RACE CONDITION (CONCURRENCY LOCKING TEST)
  // Hai khách hàng bấm đặt lịch cùng 1 tích tắc (đồng thời 100%) cho cùng 1 thợ
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST 6: [SIÊU QUAN TRỌNG] Kiểm tra chống Race Condition khi 2 khách bấm Đặt cùng 1 mili-giây");
  const slotRace = setMilliseconds(setSeconds(setMinutes(setHours(testDate, 15), 0), 0), 0);
  const slotRaceStr = slotRace.toISOString();

  // Tạo 2 yêu cầu đặt lịch đồng thời bằng Promise.allSettled
  const [req1, req2] = await Promise.allSettled([
    createBooking({
      customerName: "Khách Đua 1",
      customerPhone: "0911222333",
      serviceIds: [haircut.id],
      staffId: hoangAnh.id,
      startTime: slotRaceStr,
    }),
    createBooking({
      customerName: "Khách Đua 2",
      customerPhone: "0922333444",
      serviceIds: [haircut.id],
      staffId: hoangAnh.id,
      startTime: slotRaceStr,
    }),
  ]);

  const successCount = [req1, req2].filter((r) => r.status === "fulfilled").length;
  const failureCount = [req1, req2].filter((r) => r.status === "rejected").length;

  assert(
    successCount === 1,
    `Chính xác 1 request thành công (${successCount}/2 thành công)`
  );
  assert(
    failureCount === 1,
    `Chính xác 1 request bị từ chối với ConflictError (${failureCount}/2 bị chặn)`
  );

  const rejectedResult = [req1, req2].find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert(
    rejectedResult.reason instanceof ConflictError,
    `Request thua cuộc nhận đúng lỗi ConflictError: "${rejectedResult.reason.message}"`
  );

  // Kiểm tra trong Database xem có đúng chỉ có DUY NHẤT 1 bản ghi được tạo
  const raceBookingsInDb = await prisma.booking.findMany({
    where: {
      staffId: hoangAnh.id,
      startTime: slotRace,
    },
  });

  assert(
    raceBookingsInDb.length === 1,
    `Database Transaction bảo đảm tính toàn vẹn: Chỉ có 1 bản ghi Booking trong DB (Thực tế: ${raceBookingsInDb.length})`
  );

  // -------------------------------------------------------------------------
  // Cleanup test bookings
  // -------------------------------------------------------------------------
  const testPhones = [
    "0901234567",
    "0933111222",
    "0933444555",
    "0911222333",
    "0922333444",
  ];
  await prisma.bookingService.deleteMany({
    where: {
      booking: {
        customerPhone: { in: testPhones },
      },
    },
  });
  await prisma.booking.deleteMany({
    where: {
      customerPhone: { in: testPhones },
    },
  });

  console.log("\n========================================================================");
  console.log(`📊 KẾT QUẢ TEST: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runBookingConcurrencyTests()
  .catch((e) => {
    console.error("Lỗi khi test booking concurrency:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
