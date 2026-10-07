"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { releaseEarnings, refundToWallet } from "@/lib/payments";

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
  const hours = Math.min(12, Math.max(1, Number(formData.get("hours")) || 4));

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

  // Agreed value computed server-side from the caretaker's current rate —
  // the client can never post their own amount.
  const hourlyRate = worker.profile.caretakerDetails.hourlyRate;
  const amount = Math.round(hourlyRate * hours * 100) / 100;

  await prisma.booking.create({
    data: {
      clientId: user.id,
      workerId,
      serviceDate,
      notes: notes || null,
      hours,
      amount,
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
  }

  redirect("/dashboard?updated=1");
}
