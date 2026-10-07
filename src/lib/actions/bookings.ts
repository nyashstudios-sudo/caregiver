"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { releaseEarnings, refundToWallet } from "@/lib/payments";
import { notifyUser } from "@/lib/notify";

export type BookingState = { error?: string } | null;

/** "Book Caretaker" action from a worker profile page (clients only). */
export async function createBookingAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const user = await requireSession("/dashboard");
  if (user.role !== "CLIENT") return { error: "Only client accounts can book caretakers" };

  const workerId = String(formData.get("workerId") ?? "");
  const when = String(formData.get("serviceDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const serviceIdRaw = String(formData.get("serviceId") ?? "");
  let hours = Math.min(12, Math.max(1, Number(formData.get("hours")) || 4));

  const serviceDate = new Date(when);
  if (!workerId) return { error: "Caretaker not found" };
  if (Number.isNaN(serviceDate.getTime())) return { error: "Pick a valid date and time" };
  if (serviceDate.getTime() < Date.now() - 60_000) {
    return { error: "The service date must be in the future" };
  }

  const worker = await prisma.user.findFirst({
    where: { id: workerId, role: "WORKER" },
    include: { profile: { include: { caretakerDetails: true } } },
  });
  if (!worker?.profile?.caretakerDetails) return { error: "Caretaker not found" };

  // Fixed-price service bookings take the listed price (still server-side);
  // ad-hoc bookings compute hours × the caretaker's current rate.
  let serviceId: string | null = null;
  let amount: number;
  if (serviceIdRaw) {
    const svc = await prisma.service.findFirst({
      where: { id: serviceIdRaw, workerId, active: true },
      select: { id: true, priceKes: true },
    });
    if (!svc) return { error: "That service is no longer available" };
    serviceId = svc.id;
    amount = svc.priceKes;
    hours = 0;
  } else {
    const hourlyRate = worker.profile.caretakerDetails.hourlyRate;
    amount = Math.round(hourlyRate * hours * 100) / 100;
  }

  await prisma.booking.create({
    data: {
      clientId: user.id,
      workerId,
      serviceId,
      serviceDate,
      notes: notes || null,
      hours: serviceId ? null : hours,
      amount,
      status: "PENDING",
    },
  });

  await notifyUser(workerId, {
    title: "New booking request",
    body: `${user.name ?? "A client"} requested a booking · KES ${amount.toLocaleString("en-GB")}`,
    url: "/dashboard",
    tag: "booking-new",
  }).catch(() => undefined);

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
  const user = await requireSession("/dashboard");

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
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: next },
    });
    // Escrow: completed → pay the caretaker; cancelled after payment → refund client.
    if (next === "COMPLETED") await releaseEarnings(updated).catch(() => false);
    if (next === "CANCELLED") await refundToWallet(updated).catch(() => false);

    // PWA push to the counterparty.
    const verb =
      next === "ACCEPTED"
        ? "accepted your booking"
        : next === "COMPLETED"
          ? "marked the job complete"
          : "cancelled a booking";
    await notifyUser(isClient ? booking.workerId : booking.clientId, {
      title: "Booking update",
      body: `${user.name ?? "Someone"} ${verb}`,
      url: "/dashboard",
      tag: `booking-${id}`,
    }).catch(() => undefined);
  }

  redirect("/dashboard?updated=1");
}
