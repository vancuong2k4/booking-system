# 📅 Smart Booking System

> **A modern, high-performance appointment booking and management platform designed specifically for Hair Salons, Spas, and Healthcare Clinics.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge)](LICENSE)

---

## 🌟 Key Highlights

- **⚡ Frictionless Client Booking Wizard:** Single-page step-by-step reservation experience without requiring prior account registration.
- **⏱️ Smart Slot Availability Engine:** Real-time mathematical calculation of valid time slots taking into account store hours, staff work shifts, lunch break exclusion, staff time-offs, and service cleanup buffer times.
- **🔒 Zero Double-Booking Guarantee:** Database transaction locks (`prisma.$transaction`) to completely eliminate race conditions and concurrent booking overlap.
- **📊 Admin Operations Dashboard:** Real-time multi-column Staff Calendar Grid, quick Walk-in customer dispatching, one-click status lifecycle transitions, and business performance analytics.

---

## 🚀 System Architecture & Core Logic

### 1. Slot Availability & Occupancy Formula
For an appointment requesting a set of services $S = \{s_1, s_2, ..., s_k\}$:
$$\text{Total Duration} = \sum_{i=1}^k s_i.\text{durationMins}$$
$$\text{Total Buffer} = \sum_{i=1}^k s_i.\text{bufferMins}$$
$$\text{Total Occupancy} = \text{Total Duration} + \text{Total Buffer}$$

A candidate time slot $[Start_A, End_A]$ is strictly validated against:
1. **Store Hours:** $Start_A \ge Business.\text{openTime}$ and $End_A \le Business.\text{closeTime}$.
2. **Staff Shift:** Staff works on that day, with $Start_A \ge Shift.\text{startTime}$ and $End_A \le Shift.\text{endTime}$.
3. **Break Interval:** Zero overlap with staff break times $[\text{breakStart}, \text{breakEnd}]$.
4. **Time-off Requests:** Zero overlap with approved `StaffTimeOff` periods.
5. **Conflict-Free (No Overlap):** Must not overlap with any active booking (`PENDING`, `CONFIRMED`, `CHECKED_IN`):
   $$\text{NOT}(Start_A < End_B \text{ AND } End_A > Start_B)$$

### 2. Booking Status Lifecycle
```
[PENDING] ──> [CONFIRMED] ──> [CHECKED_IN] ──> [COMPLETED]
    │              │
    └──> [CANCELLED] <── [NO_SHOW]
```

Full architectural design and database schemas are documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Actions & Route Handlers) |
| **Language** | TypeScript 5 (Strict Mode) |
| **User Interface** | Tailwind CSS v4, Lucide Icons, shadcn/ui design patterns |
| **Database & ORM**| SQLite (Development) / PostgreSQL (Production) + Prisma ORM |
| **Data Validation**| Zod Schema Validation |
| **Forms & State** | React Hook Form + `@hookform/resolvers` |
| **Date Time Engine**| `date-fns` (Timezone-safe timeline calculations) |
| **Package Manager**| `pnpm` |

---

## 📂 Project Structure

```
├── prisma/
│   ├── schema.prisma       # Prisma data models (7 relational entities)
│   └── seed.ts             # Comprehensive development fixtures
├── src/
│   ├── app/
│   │   ├── (client)/       # Client booking wizard & status tracking
│   │   ├── admin/          # Receptionist & manager dashboard
│   │   ├── api/            # REST API endpoints (availability, bookings, admin)
│   │   ├── globals.css     # Global theme styling
│   │   └── layout.tsx      # Root application layout
│   ├── components/
│   │   ├── ui/             # Core UI components
│   │   ├── booking/        # Multi-step booking flow widgets
│   │   └── admin/          # Calendar grid, modals & tables
│   ├── lib/
│   │   ├── prisma.ts       # Singleton Prisma Client instance
│   │   ├── availability.ts # Core slot calculation engine
│   │   ├── validations.ts  # Zod request validators
│   │   └── utils.ts        # Common utility helpers
│   └── types/              # Extended TypeScript definitions
├── ARCHITECTURE.md         # Deep-dive system architecture specification
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 1. Clone the repository
```bash
git clone https://github.com/vancuong2k4/booking-system.git
cd booking-system
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Setup Environment Variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Default SQLite database connection:
```env
DATABASE_URL="file:./dev.db"
```

### 4. Initialize Database & Seed Sample Data
Sync database tables and load sample store, services, staff, work schedules, and bookings:
```bash
pnpm exec prisma db push
pnpm exec prisma db seed
```

### 5. Run Development Server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to experience the booking flow.

---

## 📡 Core API Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/availability` | Calculate available time slots by date & service IDs | Public |
| `POST` | `/api/bookings` | Atomic transaction booking creation | Public |
| `GET` | `/api/bookings/:id` | Fetch booking details by code / phone number | Public |
| `GET` | `/api/admin/bookings` | Retrieve day schedule for Calendar Grid | Admin |
| `POST` | `/api/admin/bookings/walk-in`| Instant reservation for walk-in clients | Admin |
| `PATCH`| `/api/admin/bookings/:id/status`| Update status (`CHECKED_IN`, `COMPLETED`, etc.)| Admin |
| `GET` | `/api/admin/stats` | Business KPI metrics & staff utilization | Admin |

---

## 📄 License
This project is licensed under the MIT License.
