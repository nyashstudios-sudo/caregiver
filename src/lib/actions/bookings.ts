"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export type BookingState = { error?: string } | null;

/** "Book Caretaker" action from a worker profile page (clients only). */
export async function createBookingAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in as a client to book a caretaker" };
  if (user.role !== "CLIENT") return { error: "Only client accounts can book caretakers" };

  const workerId = String(formData.get("workerId") ?? "");
  const when = String(formData.get("serviceDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const serviceDate = new Date(when);
  if (!workerId) return { error: "Caretaker not found" };
  if (Number.isNaN(serviceDate.getTime())) return { error: "Pick a valid date and time" };
  if (serviceDate.getTime() < Date.now() - 60_000) {
    return { error: "The service date must be in the future" };
  }

  const worker = await prisma.user.findFirst({
    where: { id: workerId, role: "WORKER" },
    include: { profile: true },
  });
  if (!worker?.profile) return { error: "Caretaker not found" };

  await prisma.booking.create({
    data: {
      clientId: user.id,
      workerId,
      serviceDate,
      notes: notes || null,
      status: "PENDING",
    },
  });

  redirect("/dashboard?booked=1");
}

export type BookingIntent = "accept" | "complete" | "cancel";

/**
 * Booking status transitions (readme §4D):
 *  - worker owner: PENDING -> ACCEPTED, PENDING -> CANCELLED,
 *                  ACCEPTED -> COMPLETED, ACCEPTED -> CANCELLED
 *  - client owner: PENDING/ACCEPTED -> CANCELLED
 *  - admins may act on any booking.
 */
export async function updateBookingAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "") as BookingIntent;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) redirect("/dashboard?error=notfound");

  const isClient = booking.clientId === user.id;
  const isWorker = booking.workerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isClient && !isWorker && !isAdmin) redirect("/dashboard?error=forbidden");

  const canManage = isWorker || isAdmin;
  const canCancel = isClient || isWorker || isAdmin;

  let next: "ACCEPTED" | "COMPLETED" | "CANCELLED" | null = null;
  if (intent === "accept" && canManage && booking.status === "PENDING") next = "ACCEPTED";
  else if (intent === "complete" && canManage && booking.status === "ACCEPTED") next = "COMPLETED";
  else if (
    intent === "cancel" &&
    canCancel &&
    (booking.status === "PENDING" || booking.status === "ACCEPTED")
  ) {
    next = "CANCELLED";
  }

  if (next) {
    await prisma.booking.update({ where: { id }, data: { status: next } });
  }

  redirect("/dashboard?updated=1");
}
