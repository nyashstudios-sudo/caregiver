Here is the complete project instruction set formatted as a Markdown (`.md`) file, ready for you to save directly into your project repository (e.g., as `README.md` or `AI_AGENT_INSTRUCTIONS.md`).

```markdown
# Project Instruction Set: Home Care & Management Platform

## 1. Project Overview & Objective
Build a full-stack, responsive web application for a **Home Care and Management Platform**. The platform connects clients/employers looking to hire verified domestic caretakers, household managers, and wellness professionals with skilled workers who can showcase specialized certifications (such as first-aid and professional massage therapy).

## 2. Tech Stack & Infrastructure
* **Framework:** Next.js (App Router, utilizing Server Actions and API routes)
* **Styling:** Tailwind CSS (Mobile-first, clean, modern UI)
* **Database & ORM:** PostgreSQL managed via Prisma ORM
* **Authentication:** Supabase Auth or NextAuth (supporting email/password and phone-based access workflows)
* **File Storage:** Supabase Storage or Cloudinary (for uploading profile photos, certificates, and ID verification)
* **Deployment Target:** Vercel

---

## 3. Core Database Schema (`schema.prisma`)
Implement the following database schema to handle multi-role users, extended profiles, caretaker skills, certifications, and booking workflows:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  CLIENT
  WORKER
  ADMIN
}

enum BookingStatus {
  PENDING
  ACCEPTED
  COMPLETED
  CANCELLED
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  phone         String?   @unique
  passwordHash  String
  role          Role      @default(CLIENT)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  profile       Profile?
  clientBookings Booking[] @relation("ClientBookings")
  workerBookings Booking[] @relation("WorkerBookings")
}

model Profile {
  id               String            @id @default(cuid())
  userId           String            @unique
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName         String
  location         String
  bio              String?
  avatarUrl        String?
  
  caretakerDetails CaretakerDetails?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

model CaretakerDetails {
  id                 String          @id @default(cuid())
  profileId          String          @unique
  profile            Profile         @relation(fields: [profileId], references: [id], onDelete: Cascade)
  hourlyRate         Float
  yearsExperience    Int
  hasFirstAid        Boolean         @default(false)
  isCertifiedMassage Boolean         @default(false)
  skillsSummary      String?
  
  certifications     Certification[]
}

model Certification {
  id                 String           @id @default(cuid())
  caretakerDetailsId String
  caretakerDetails   CaretakerDetails @relation(fields: [caretakerDetailsId], references: [id], onDelete: Cascade)
  title              String
  documentUrl        String
  issuedAt           DateTime?
}

model Booking {
  id          String        @id @default(cuid())
  clientId    String
  client      User          @relation("ClientBookings", fields: [clientId], references: [id])
  workerId    String
  worker      User          @relation("WorkerBookings", fields: [workerId], references: [id])
  status      BookingStatus @default(PENDING)
  serviceDate DateTime
  notes       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

```

---

## 4. Key Functional Modules to Implement

### A. Authentication & Role Selection

* Implement signup/login flows supporting role choice (`CLIENT` vs. `WORKER`).
* Route users dynamically upon login:
* **Clients** are directed to a search/dashboard interface to browse available caretakers.
* **Workers** are directed to a management portal to update their profile, availability, rates, and skills.



### B. Caretaker Discovery & Filtering (Client View)

* Create a searchable directory page (`/caretakers`) where clients can filter workers by:
* Location
* Maximum hourly rate
* Verified specializations (e.g., toggle checkboxes for `Has First Aid` and `Certified Massage`).


* Build individual profile view pages showing worker bios, years of experience, pricing, and uploaded verification credentials.

### C. Worker Portfolio & Credential Management (Worker View)

* Build a dashboard where workers can edit their `CaretakerDetails`.
* Provide an upload component allowing workers to attach PDF or image files of their certifications (First Aid, Massage diplomas), saving the asset URLs to the `Certification` table.

### D. Booking & Request Workflow

* Implement a "Book Caretaker" action form on worker profile views.
* Create a bookings management view for both clients and workers to track status updates (`PENDING` $\rightarrow$ `ACCEPTED` $\rightarrow$ `COMPLETED`).

---

## 5. UI/UX Design Guidelines

* **Layout Style:** Clean, trustworthy, mobile-responsive layout built with Tailwind CSS. Use card components for worker listings with distinct badge indicators for verified skills (e.g., a green badge for "First Aid Certified" and "Professional Massage").
* **Navigation:** Responsive header with dynamic links based on user authentication state and role.

## 6. Execution Instructions for the Agent

1. Initialize the project structure using Next.js App Router and configure Tailwind CSS.
2. Set up Prisma, inject the provided schema, and run initial migrations against a PostgreSQL instance.
3. Construct the authentication layout and role-based redirection middleware.
4. Develop the public search directory and filtered query handlers using Prisma client.
5. Build the worker profile modification forms and booking action routes.

```

```