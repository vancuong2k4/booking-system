import { getAvailableSlots } from "../src/lib/availability";
import { isOverlapping, parseTimeString } from "../src/lib/date-utils";
import prisma from "../src/lib/prisma";
import { addDays, format, setHours, setMinutes } from "date-fns";

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

async function runTests() {
  console.log("============================================================");
  console.log("🧪 BẮT ĐẦU CHẠY UNIT TEST: AVAILABILITY ENGINE (TASK 2.1)");
  console.log("============================================================\n");

  // Fetch seed data
  const business = await prisma.business.findFirst();
  if (!business) {
    throw new Error("Cần chạy seed trước khi test: pnpm exec prisma db seed");
  }

  const services = await prisma.service.findMany({
    where: { businessId: business.id, isActive: true },
    orderBy: { durationMins: "asc" },
  });

  const staffList = await prisma.staff.findMany({
    where: { businessId: business.id, isActive: true },
    include: { schedules: true },
  });

  const haircutService = services.find((s) => s.durationMins === 45)!; // 45m + 15m buffer
  const longService = services.find((s) => s.durationMins === 120)!; // 120m + 30m buffer
  const hoangAnh = staffList.find((st) => st.name === "Hoàng Anh")!;
  const minhTrang = staffList.find((st) => st.name === "Minh Trang")!;

  // ---------------------------------------------------------
  // TEST SUITE 1: Overlap Algorithm Pure Mathematical Tests
  // ---------------------------------------------------------
  console.log("📌 TEST SUITE 1: Kiểm tra tính chuẩn xác của công thức Overlap");
  const baseDate = new Date();
  const t0900 = parseTimeString("09:00", baseDate);
  const t1000 = parseTimeString("10:00", baseDate);
  const t1030 = parseTimeString("10:30", baseDate);
  const t1100 = parseTimeString("11:00", baseDate);
  const t1130 = parseTimeString("11:30", baseDate);

  // Case A: Exact adjacent slots [09:00, 10:00] and [10:00, 11:00] -> NO overlap
  assert(
    !isOverlapping(t0900, t1000, t1000, t1100),
    "Hai khoảng giờ liền kề (End_A = Start_B) KHÔNG ĐƯỢC tính là trùng nhau",
    "09:00-10:00 và 10:00-11:00 không được giao nhau"
  );

  // Case B: Partial overlap [09:00, 10:30] and [10:00, 11:00] -> Overlap
  assert(
    isOverlapping(t0900, t1030, t1000, t1100),
    "Giao cắt 1 phần (Slot A lấn vào đầu Slot B) phải phát hiện Overlap"
  );

  // Case C: Enclosure [09:00, 11:30] and [10:00, 11:00] -> Overlap
  assert(
    isOverlapping(t0900, t1130, t1000, t1100),
    "Slot A bao trọn hoàn toàn Slot B phải phát hiện Overlap"
  );

  // Case D: Inside [10:00, 10:30] and [09:00, 11:00] -> Overlap
  assert(
    isOverlapping(t1000, t1030, t0900, t1100),
    "Slot A nằm trọn bên trong Slot B phải phát hiện Overlap"
  );

  // ---------------------------------------------------------
  // TEST SUITE 2: Lunch Break Excluded
  // ---------------------------------------------------------
  console.log("\n📌 TEST SUITE 2: Kiểm tra loại trừ khung giờ nghỉ trưa (Break Time)");
  // Chọn một ngày thứ Hai hoặc Thứ Ba trong tương lai (3 ngày sau)
  const testDate = addDays(new Date(), 7); // 7 ngày sau đảm bảo không vướng quá khứ
  // Tìm một ngày mà Hoàng Anh đi làm (Hoàng Anh làm từ T2 đến T7, nghỉ CN)
  let workingDate = testDate;
  while (workingDate.getDay() === 0) {
    workingDate = addDays(workingDate, 1);
  }

  const dateStr = format(workingDate, "yyyy-MM-dd");
  const resultForHoangAnh = await getAvailableSlots({
    date: dateStr,
    serviceIds: [haircutService.id], // 45m duration + 15m buffer = 60m total occupancy
    staffId: hoangAnh.id,
  });

  // Hoàng Anh có ca làm 08:30 - 18:30, nghỉ trưa 12:00 - 13:00
  // Với dịch vụ 45m + 15m buffer = 60m:
  // Slot 11:30 -> Occupancy 11:30 - 12:30 -> Chạm 12:00-13:00 -> PHẢI BỊ CHẶN
  // Slot 12:00 -> Occupancy 12:00 - 13:00 -> Trùng hoàn toàn -> PHẢI BỊ CHẶN
  // Slot 12:30 -> Occupancy 12:30 - 13:30 -> Chạm 12:00-13:00 -> PHẢI BỊ CHẶN
  // Slot 13:00 -> Occupancy 13:00 - 14:00 -> Hết giờ nghỉ trưa -> PHẢI CÓ
  const hoangAnhSlotTimes = resultForHoangAnh.slots.map((s) => s.time);

  assert(
    !hoangAnhSlotTimes.includes("11:30"),
    "Slot 11:30 bị chặn vì tổng thời gian chiếm dụng (đến 12:30) lấn vào giờ nghỉ trưa (12:00-13:00)"
  );
  assert(
    !hoangAnhSlotTimes.includes("12:00"),
    "Slot 12:00 bị chặn vì rơi đúng vào giờ nghỉ trưa của thợ"
  );
  assert(
    !hoangAnhSlotTimes.includes("12:30"),
    "Slot 12:30 bị chặn vì rơi vào giờ nghỉ trưa của thợ"
  );
  assert(
    hoangAnhSlotTimes.includes("13:00"),
    "Slot 13:00 được mở vì giờ nghỉ trưa đã kết thúc lúc 13:00"
  );

  // ---------------------------------------------------------
  // TEST SUITE 3: Buffer Time Consideration
  // ---------------------------------------------------------
  console.log("\n📌 TEST SUITE 3: Kiểm tra tính toán Thời gian đệm (Buffer Time)");
  // Dọn dẹp test booking cũ nếu có và tạo 1 booking cụ thể để test
  const testBookingDate = addDays(workingDate, 7);
  const testBookingDateStr = format(testBookingDate, "yyyy-MM-dd");

  const bStart = parseTimeString("09:30", testBookingDate);
  const bEnd = parseTimeString("10:15", testBookingDate); // 45 phút

  const createdTestBooking = await prisma.booking.create({
    data: {
      businessId: business.id,
      staffId: hoangAnh.id,
      customerName: "Khách Test Buffer",
      customerPhone: "0999888777",
      startTime: bStart,
      endTime: bEnd,
      totalDurationMins: 45,
      totalPrice: haircutService.price,
      status: "CONFIRMED",
      bookingServices: {
        create: {
          serviceId: haircutService.id,
          priceAtBooking: haircutService.price,
          durationAtBooking: 45,
        },
      },
    },
  });

  try {
    const slotsWithBooking = await getAvailableSlots({
      date: testBookingDateStr,
      serviceIds: [haircutService.id], // 45m + 15m buffer
      staffId: hoangAnh.id,
    });

    const times = slotsWithBooking.slots.map((s) => s.time);

    // Lịch hẹn: 09:30 - 10:15, Buffer 15m -> Thợ bận đến 10:30.
    // Slot 09:00: làm 45m + 15m buffer = bận 09:00 - 10:00 -> Chạm 09:30 -> BỊ CHẶN
    // Slot 09:30: Trùng giờ bắt đầu -> BỊ CHẶN
    // Slot 10:00: Thợ đang dọn dẹp/nghỉ ngơi (đến 10:30) -> BỊ CHẶN
    // Slot 10:30: Thợ đã xong buffer -> HỢP LỆ
    assert(
      !times.includes("09:00"),
      "Slot 09:00 bị chặn vì tổng thời gian phục vụ + buffer lấn vào lịch 09:30"
    );
    assert(!times.includes("09:30"), "Slot 09:30 bị chặn do trùng lịch hẹn đã có");
    assert(
      !times.includes("10:00"),
      "Slot 10:00 bị chặn vì thợ vẫn đang trong 15 phút Buffer dọn dẹp sau ca 09:30-10:15"
    );
    assert(
      times.includes("10:30"),
      "Slot 10:30 mở bình thường vì thời gian Buffer của ca trước đã kết thúc lúc 10:30"
    );
  } finally {
    // Cleanup test booking
    await prisma.bookingService.deleteMany({
      where: { bookingId: createdTestBooking.id },
    });
    await prisma.booking.delete({ where: { id: createdTestBooking.id } });
  }

  // ---------------------------------------------------------
  // TEST SUITE 4: Approved Time-off Exclusion
  // ---------------------------------------------------------
  console.log("\n📌 TEST SUITE 4: Kiểm tra đơn nghỉ phép (Staff Time-off)");
  // Minh Trang có đơn nghỉ phép mẫu ở seed.ts (3 ngày tới, 14:00 - 17:00)
  const timeOffRecord = await prisma.staffTimeOff.findFirst({
    where: { staffId: minhTrang.id },
  });

  if (timeOffRecord) {
    const timeOffDateStr = format(timeOffRecord.startDateTime, "yyyy-MM-dd");
    const slotsOnTimeOffDay = await getAvailableSlots({
      date: timeOffDateStr,
      serviceIds: [haircutService.id],
      staffId: minhTrang.id,
    });

    const timeOffSlots = slotsOnTimeOffDay.slots.map((s) => s.time);
    assert(
      !timeOffSlots.includes("14:00"),
      "Minh Trang không nhận lịch lúc 14:00 do có đơn nghỉ phép từ 14:00 - 17:00"
    );
    assert(
      !timeOffSlots.includes("15:00"),
      "Minh Trang không nhận lịch lúc 15:00 trong giờ nghỉ phép"
    );
    assert(
      !timeOffSlots.includes("16:00"),
      "Minh Trang không nhận lịch lúc 16:00 trong giờ nghỉ phép"
    );
  } else {
    console.log("  ⚠️ Bỏ qua test TimeOff do không tìm thấy bản ghi");
  }

  // ---------------------------------------------------------
  // TEST SUITE 5: Store Hours & Long Services
  // ---------------------------------------------------------
  console.log("\n📌 TEST SUITE 5: Kiểm tra giờ đóng cửa và dịch vụ thời lượng lớn");
  // Tìm một ngày mà Quốc Bảo đi làm (Quốc Bảo làm 10:00 - 20:00, nghỉ Thứ Tư: day 3)
  let quocBaoWorkingDate = testDate;
  while (quocBaoWorkingDate.getDay() === 3 || quocBaoWorkingDate.getDay() === 0) {
    quocBaoWorkingDate = addDays(quocBaoWorkingDate, 1);
  }
  const quocBaoDateStr = format(quocBaoWorkingDate, "yyyy-MM-dd");

  const longSlotsResult = await getAvailableSlots({
    date: quocBaoDateStr,
    serviceIds: [longService.id], // 120 phút = 2 giờ
  });

  const longSlotTimes = longSlotsResult.slots.map((s) => s.time);
  // Store đóng cửa lúc 20:00. Dịch vụ 2 tiếng thì slot muộn nhất có thể bắt đầu là 18:00
  assert(
    !longSlotTimes.includes("18:30"),
    "Dịch vụ 120 phút KHÔNG ĐƯỢC bắt đầu lúc 18:30 vì kết thúc lúc 20:30 (quá giờ đóng cửa 20:00)"
  );
  assert(
    !longSlotTimes.includes("19:00"),
    "Dịch vụ 120 phút KHÔNG ĐƯỢC bắt đầu lúc 19:00"
  );
  assert(
    longSlotTimes.includes("18:00"),
    "Dịch vụ 120 phút CÓ THỂ bắt đầu lúc 18:00 vì kết thúc đúng lúc 20:00 (thợ Quốc Bảo trực đến 20:00)"
  );

  // ---------------------------------------------------------
  // TEST SUITE 6: Auto-assign ("Any Staff") Multi-staff Availability
  // ---------------------------------------------------------
  console.log("\n📌 TEST SUITE 6: Kiểm tra tính năng 'Bất kỳ thợ nào rảnh'");
  const anyStaffResult = await getAvailableSlots({
    date: dateStr,
    serviceIds: [haircutService.id],
    // Không truyền staffId
  });

  assert(
    anyStaffResult.slots.length > 0,
    "Tìm thấy danh sách slot trống khi khách chọn 'Bất kỳ thợ nào rảnh'"
  );
  const firstSlot = anyStaffResult.slots[0];
  assert(
    firstSlot.availableStaff.length >= 1,
    `Mỗi slot trống phải liệt kê ít nhất 1 thợ có thể nhận việc (Slot ${firstSlot.time} có ${firstSlot.availableStaff.length} thợ rảnh)`
  );

  console.log("\n============================================================");
  console.log(`📊 KẾT QUẢ TEST: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Lỗi khi chạy unit tests:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
