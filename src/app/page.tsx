import prisma from "@/lib/prisma";
import BookingWizard from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const business = await prisma.business.findFirst();

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      ...(business ? { businessId: business.id } : {}),
    },
    orderBy: { price: "asc" },
  });

  const staffList = await prisma.staff.findMany({
    where: {
      isActive: true,
      ...(business ? { businessId: business.id } : {}),
    },
    orderBy: { name: "asc" },
  });

  return (
    <BookingWizard
      business={business}
      services={services}
      staffList={staffList}
    />
  );
}
