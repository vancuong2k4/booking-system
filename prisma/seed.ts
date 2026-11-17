import { PrismaClient } from "@prisma/client";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu gieo dữ liệu mẫu (Seeding Database)...");

  // 1. Dọn dẹp dữ liệu cũ (Clean up)
  await prisma.bookingService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.staffTimeOff.deleteMany();
  await prisma.staffSchedule.deleteMany();
  await prisma.service.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.business.deleteMany();

  // 2. Tạo 1 Cửa hàng mẫu (Business)
  const business = await prisma.business.create({
    data: {
      name: "Luxe Salon & Spa Lounge",
      openTime: "08:30",
      closeTime: "20:00",
      slotInterval: 30, // Khung giờ mặc định 30 phút
    },
  });
  console.log(`✅ Đã tạo Cửa hàng: ${business.name} (ID: ${business.id})`);

  // 3. Tạo 5 Dịch vụ mẫu (Services)
  const servicesData = [
    {
      name: "Cắt & Tạo kiểu tóc nam cao cấp",
      description: "Tư vấn kiểu tóc hợp gương mặt, cắt tỉa chi tiết, gội sấy và tạo kiểu pomade cao cấp.",
      price: 150000,
      durationMins: 45,
      bufferMins: 15,
      isActive: true,
      businessId: business.id,
    },
    {
      name: "Cắt & Sấy tạo kiểu tóc nữ",
      description: "Thiết kế layer, bob hoặc uốn cúp nhẹ, sấy bồng bềnh tự nhiên chuẩn Hàn Quốc.",
      price: 250000,
      durationMins: 60,
      bufferMins: 15,
      isActive: true,
      businessId: business.id,
    },
    {
      name: "Gội đầu dưỡng sinh & Massage cổ vai gáy",
      description: "Thư giãn đả thông kinh lạc, gội thảo dược bồ kết, massage chuyên sâu giảm nhức mỏi.",
      price: 180000,
      durationMins: 45,
      bufferMins: 15,
      isActive: true,
      businessId: business.id,
    },
    {
      name: "Uốn / Nhuộm phục hồi Collagen Keratin",
      description: "Kỹ thuật uốn setting / nhuộm thời trang kết hợp phủ bóng collagen phục hồi tóc hư tổn.",
      price: 680000,
      durationMins: 120,
      bufferMins: 30,
      isActive: true,
      businessId: business.id,
    },
    {
      name: "Chăm sóc da mặt chuyên sâu & Điện di tinh chất",
      description: "Làm sạch sâu bã nhờn, tẩy tế bào chết, điện di tế bào gốc HA cấp ẩm trẻ hóa da.",
      price: 350000,
      durationMins: 60,
      bufferMins: 15,
      isActive: true,
      businessId: business.id,
    },
  ];

  const createdServices = [];
  for (const s of servicesData) {
    const service = await prisma.service.create({ data: s });
    createdServices.push(service);
  }
  console.log(`✅ Đã tạo ${createdServices.length} Dịch vụ.`);

  // 4. Tạo 3 Nhân viên mẫu (Staff)
  const staffData = [
    {
      name: "Hoàng Anh",
      phone: "0901234567",
      role: "Senior Hair Stylist",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
      isActive: true,
      businessId: business.id,
    },
    {
      name: "Minh Trang",
      phone: "0912345678",
      role: "Spa & Skincare Specialist",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300",
      isActive: true,
      businessId: business.id,
    },
    {
      name: "Quốc Bảo",
      phone: "0987654321",
      role: "Master Barber",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
      isActive: true,
      businessId: business.id,
    },
  ];

  const createdStaff = [];
  for (const st of staffData) {
    const staff = await prisma.staff.create({ data: st });
    createdStaff.push(staff);
  }
  console.log(`✅ Đã tạo ${createdStaff.length} Nhân viên.`);

  // 5. Tạo Lịch làm việc 7 ngày (StaffSchedule: 0=CN, 1=T2, ..., 6=T7)
  // - Hoàng Anh: Làm từ T2 -> T7 (08:30 - 18:30), nghỉ trưa 12:00 - 13:00. Chủ Nhật nghỉ.
  // - Minh Trang: Làm từ T3 -> CN (09:00 - 19:00), nghỉ trưa 12:30 - 13:30. Thứ Hai nghỉ.
  // - Quốc Bảo: Làm từ T2 -> CN (10:00 - 20:00), nghỉ trưa 13:00 - 14:00. Thứ Tư nghỉ.
  const scheduleConfigs = [
    {
      staffId: createdStaff[0].id, // Hoàng Anh
      offDay: 0, // Nghỉ Chủ Nhật
      startTime: "08:30",
      endTime: "18:30",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    {
      staffId: createdStaff[1].id, // Minh Trang
      offDay: 1, // Nghỉ Thứ Hai
      startTime: "09:00",
      endTime: "19:00",
      breakStart: "12:30",
      breakEnd: "13:30",
    },
    {
      staffId: createdStaff[2].id, // Quốc Bảo
      offDay: 3, // Nghỉ Thứ Tư
      startTime: "10:00",
      endTime: "20:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    },
  ];

  for (const config of scheduleConfigs) {
    for (let day = 0; day <= 6; day++) {
      const isWorking = day !== config.offDay;
      await prisma.staffSchedule.create({
        data: {
          staffId: config.staffId,
          dayOfWeek: day,
          startTime: config.startTime,
          endTime: config.endTime,
          breakStart: config.breakStart,
          breakEnd: config.breakEnd,
          isWorkingDay: isWorking,
        },
      });
    }
  }
  console.log(`✅ Đã tạo Lịch làm việc 7 ngày cho 3 nhân viên.`);

  // 6. Tạo 1 đơn Nghỉ phép mẫu (StaffTimeOff)
  // Minh Trang xin nghỉ 1 buổi vào 3 ngày tới (từ 14:00 đến 17:00)
  const timeOffDate = addDays(new Date(), 3);
  const timeOffStart = setMilliseconds(setSeconds(setMinutes(setHours(timeOffDate, 14), 0), 0), 0);
  const timeOffEnd = setMilliseconds(setSeconds(setMinutes(setHours(timeOffDate, 17), 0), 0), 0);

  await prisma.staffTimeOff.create({
    data: {
      staffId: createdStaff[1].id,
      startDateTime: timeOffStart,
      endDateTime: timeOffEnd,
      reason: "Bận việc gia đình cá nhân",
    },
  });
  console.log(`✅ Đã tạo đơn Nghỉ phép mẫu cho nhân viên Minh Trang.`);

  // 7. Tạo một số Booking mẫu (Bookings)
  // Booking 1: Hôm nay, Hoàng Anh cắt tóc cho anh Nam (CONFIRMED)
  const today = new Date();
  const b1Start = setMilliseconds(setSeconds(setMinutes(setHours(today, 9), 30), 0), 0);
  const b1End = setMilliseconds(setSeconds(setMinutes(setHours(today, 10), 15), 0), 0); // 45 phút

  const booking1 = await prisma.booking.create({
    data: {
      businessId: business.id,
      staffId: createdStaff[0].id,
      customerName: "Nguyễn Văn Nam",
      customerPhone: "0988111222",
      customerNote: "Khách quen, thích cắt kiểu Side Part cổ điển",
      startTime: b1Start,
      endTime: b1End,
      totalDurationMins: 45,
      totalPrice: createdServices[0].price,
      status: "CONFIRMED",
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking1.id,
      serviceId: createdServices[0].id,
      priceAtBooking: createdServices[0].price,
      durationAtBooking: createdServices[0].durationMins,
    },
  });

  // Booking 2: Hôm nay, Minh Trang chăm sóc da cho chị Mai (COMPLETED)
  const b2Start = setMilliseconds(setSeconds(setMinutes(setHours(today, 10), 0), 0), 0);
  const b2End = setMilliseconds(setSeconds(setMinutes(setHours(today, 11), 0), 0), 0); // 60 phút

  const booking2 = await prisma.booking.create({
    data: {
      businessId: business.id,
      staffId: createdStaff[1].id,
      customerName: "Trần Thị Mai",
      customerPhone: "0977333444",
      customerNote: "Da nhạy cảm, cần dùng tinh chất dịu nhẹ",
      startTime: b2Start,
      endTime: b2End,
      totalDurationMins: 60,
      totalPrice: createdServices[4].price,
      status: "COMPLETED",
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking2.id,
      serviceId: createdServices[4].id,
      priceAtBooking: createdServices[4].price,
      durationAtBooking: createdServices[4].durationMins,
    },
  });

  // Booking 3: Ngày mai, Quốc Bảo - Cắt tóc & Gội đầu dưỡng sinh (PENDING)
  const tomorrow = addDays(today, 1);
  const b3Start = setMilliseconds(setSeconds(setMinutes(setHours(tomorrow, 14), 0), 0), 0);
  const b3End = setMilliseconds(setSeconds(setMinutes(setHours(tomorrow, 15), 30), 0), 0); // 45 + 45 = 90 phút

  const booking3 = await prisma.booking.create({
    data: {
      businessId: business.id,
      staffId: createdStaff[2].id,
      customerName: "Lê Hoàng Long",
      customerPhone: "0966555666",
      customerNote: "Đặt hẹn qua website",
      startTime: b3Start,
      endTime: b3End,
      totalDurationMins: 90,
      totalPrice: createdServices[0].price + createdServices[2].price,
      status: "PENDING",
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking3.id,
      serviceId: createdServices[0].id,
      priceAtBooking: createdServices[0].price,
      durationAtBooking: createdServices[0].durationMins,
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking3.id,
      serviceId: createdServices[2].id,
      priceAtBooking: createdServices[2].price,
      durationAtBooking: createdServices[2].durationMins,
    },
  });

  console.log(`✅ Đã tạo 3 Bookings mẫu với các trạng thái CONFIRMED, COMPLETED, PENDING.`);
  console.log("🎉 Hoàn tất gieo dữ liệu mẫu (Seeding completed successfully)!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
