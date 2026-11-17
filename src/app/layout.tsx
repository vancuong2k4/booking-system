import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booking System - Hệ thống Đặt lịch hẹn",
  description: "Hệ thống Đặt lịch hẹn dành cho Tiệm tóc, Spa và Phòng khám nhỏ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">{children}</body>
    </html>
  );
}

