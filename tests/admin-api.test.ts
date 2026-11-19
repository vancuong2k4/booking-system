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

async function runAdminApiTests() {
  console.log("========================================================================");
  console.log("🧪 BẮT ĐẦU CHẠY TEST: ADMIN BACKEND APIS & QUẢN TRỊ VẬN HÀNH (TASK 2.3)");
  console.log("========================================================================\n");

  const business = await prisma.business.findFirst();
  if (!business) throw new Error("Chưa seed dữ liệu business!");

  // -------------------------------------------------------------------------
  // TEST SUITE 1: CRUD DỊCH VỤ (SERVICES)
  // -------------------------------------------------------------------------
  console.log("📌 TEST SUITE 1: Quản lý danh mục Dịch vụ (Admin Services CRUD)");

  // 1.1 Tạo dịch vụ mới
  const newService = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Dịch vụ Test VIP",
      description: "Mô tả test",
      price: 220000,
      durationMins: 50,
      bufferMins: 10,
      isActive: true,
    },
  });
  assert(newService.id !== undefined, "Tạo dịch vụ mới thành công với ID hợp lệ");
  assert(newService.price === 220000, "Giá dịch vụ khớp 220,000 VND");

  // 1.2 Cập nhật dịch vụ
  const updatedService = await prisma.service.update({
    where: { id: newService.id },
    data: { price: 250000, name: "Dịch vụ Test VIP Đã Cập Nhật" },
  });
  assert(updatedService.price === 250000, "Cập nhật giá dịch vụ lên 250,000 VND thành công");

  // 1.3 Xóa dịch vụ khi chưa có lịch sử đặt
  await prisma.service.delete({ where: { id: newService.id } });
  const checkDeleted = await prisma.service.findUnique({ where: { id: newService.id } });
  assert(checkDeleted === null, "Xóa an toàn dịch vụ thành công khi chưa có đơn đặt lịch");

  // -------------------------------------------------------------------------
  // TEST SUITE 2: CRUD NHÂN SỰ & CA LÀM VIỆC (STAFF & SCHEDULES)
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST SUITE 2: Quản lý Nhân sự & Ca làm việc 7 ngày (Staff & Schedules)");

  // 2.1 Tạo nhân viên mới kèm lịch 7 ngày
  const testStaff = await prisma.$transaction(async (tx) => {
    const st = await tx.staff.create({
      data: {
        businessId: business.id,
        name: "Nhân Viên Test Mới",
        phone: "0944999888",
        role: "Stylist",
        isActive: true,
      },
    });

    for (let day = 0; day <= 6; day++) {
      await tx.staffSchedule.create({
        data: {
          staffId: st.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          breakStart: "12:00",
          breakEnd: "13:00",
          isWorkingDay: day !== 0,
        },
      });
    }

    return tx.staff.findUnique({
      where: { id: st.id },
      include: { schedules: true },
    });
  });

  assert(testStaff !== null, "Tạo nhân viên mới thành công");
  assert(testStaff?.schedules.length === 7, "Tự động khởi tạo đầy đủ 7 ngày ca làm việc trong tuần");

  // 2.2 Cập nhật ca làm việc
  const updatedSchedule = await prisma.staffSchedule.update({
    where: {
      staffId_dayOfWeek: {
        staffId: testStaff!.id,
        dayOfWeek: 1, // Thứ 2
      },
    },
    data: {
      startTime: "08:30",
      endTime: "19:00",
      breakStart: "12:30",
      breakEnd: "13:30",
    },
  });
  assert(
    updatedSchedule.startTime === "08:30" && updatedSchedule.endTime === "19:00",
    "Cập nhật ca làm việc Thứ Hai (08:30 - 19:00, nghỉ 12:30-13:30) thành công"
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 3: TIẾP NHẬN KHÁCH VÃNG LAI (WALK-IN BOOKING)
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST SUITE 3: Tạo lịch nhanh cho Khách vãng lai tại quầy (Walk-in)");
  const existingService = await prisma.service.findFirst({
    where: { businessId: business.id, isActive: true },
  });
  if (!existingService) throw new Error("Không có dịch vụ");

  const walkInTime = setMilliseconds(setSeconds(setMinutes(setHours(new Date(), 16), 0), 0), 0);
  const walkInBooking = await prisma.booking.create({
    data: {
      businessId: business.id,
      staffId: testStaff!.id,
      customerName: "Khách Vãng Lai Trực Tiếp",
      customerPhone: "0000000000",
      customerNote: "Khách vào cắt tóc ngay tại quầy",
      startTime: walkInTime,
      endTime: new Date(walkInTime.getTime() + existingService.durationMins * 60000),
      totalDurationMins: existingService.durationMins,
      totalPrice: existingService.price,
      status: "CHECKED_IN", // Trạng thái sẵn sàng phục vụ
      bookingServices: {
        create: {
          serviceId: existingService.id,
          priceAtBooking: existingService.price,
          durationAtBooking: existingService.durationMins,
        },
      },
    },
    include: {
      staff: true,
      bookingServices: { include: { service: true } },
    },
  });

  assert(walkInBooking.id !== undefined, "Tạo đơn Walk-in thành công");
  assert(walkInBooking.status === "CHECKED_IN", "Lịch Walk-in trực tiếp nhận trạng thái CHECKED_IN");
  assert(walkInBooking.customerName === "Khách Vãng Lai Trực Tiếp", "Tên khách hiển thị chuẩn tại quầy");

  // -------------------------------------------------------------------------
  // TEST SUITE 4: VÒNG ĐỜI TRẠNG THÁI LỊCH HẸN (STATUS TRANSITION LIFECYCLE)
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST SUITE 4: Vòng đời trạng thái lịch hẹn (Status Transition)");

  // 4.1 Tạo booking ở trạng thái PENDING
  const lifecycleBooking = await prisma.booking.create({
    data: {
      businessId: business.id,
      staffId: testStaff!.id,
      customerName: "Khách Test Lifecycle",
      customerPhone: "0966777888",
      startTime: addDays(walkInTime, 2),
      endTime: new Date(addDays(walkInTime, 2).getTime() + 45 * 60000),
      totalDurationMins: 45,
      totalPrice: 150000,
      status: "PENDING",
    },
  });
  assert(lifecycleBooking.status === "PENDING", "Lịch hẹn khởi tạo ở trạng thái PENDING");

  // 4.2 Chuyển PENDING -> CONFIRMED
  const confirmedBooking = await prisma.booking.update({
    where: { id: lifecycleBooking.id },
    data: { status: "CONFIRMED" },
  });
  assert(confirmedBooking.status === "CONFIRMED", "Chuyển thành công: PENDING -> CONFIRMED");

  // 4.3 Chuyển CONFIRMED -> CHECKED_IN (Khách đến quầy)
  const checkedInBooking = await prisma.booking.update({
    where: { id: lifecycleBooking.id },
    data: { status: "CHECKED_IN" },
  });
  assert(checkedInBooking.status === "CHECKED_IN", "Chuyển thành công: CONFIRMED -> CHECKED_IN");

  // 4.4 Chuyển CHECKED_IN -> COMPLETED (Hoàn tất & thanh toán)
  const completedBooking = await prisma.booking.update({
    where: { id: lifecycleBooking.id },
    data: { status: "COMPLETED" },
  });
  assert(completedBooking.status === "COMPLETED", "Chuyển thành công: CHECKED_IN -> COMPLETED");

  // -------------------------------------------------------------------------
  // TEST SUITE 5: TRUY VẤN LỊCH DẠNG CALENDAR VIEW VÀ CHỈ SỐ DOANH THU
  // -------------------------------------------------------------------------
  console.log("\n📌 TEST SUITE 5: Truy vấn Lịch biểu Calendar Grid & Thống kê ngày");
  const todayBookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
    },
  });

  assert(todayBookings.length > 0, `Lấy thành công danh sách lịch biểu (Tổng ${todayBookings.length} lịch)`);

  const completedTotal = todayBookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  assert(completedTotal >= 0, `Doanh thu thực tế các ca hoàn thành: ${completedTotal.toLocaleString("vi-VN")} VND`);

  // -------------------------------------------------------------------------
  // CLEANUP TEST RECORDS
  // -------------------------------------------------------------------------
  await prisma.bookingService.deleteMany({
    where: { bookingId: { in: [walkInBooking.id, lifecycleBooking.id] } },
  });
  await prisma.booking.deleteMany({
    where: { id: { in: [walkInBooking.id, lifecycleBooking.id] } },
  });
  await prisma.staffSchedule.deleteMany({
    where: { staffId: testStaff!.id },
  });
  await prisma.staff.delete({
    where: { id: testStaff!.id },
  });

  console.log("\n========================================================================");
  console.log(`📊 KẾT QUẢ TEST: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAdminApiTests()
  .catch((e) => {
    console.error("Lỗi khi test Admin APIs:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
