"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { ActionState } from "./state";

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}

const reviewSchema = z.object({
  bookingId: z.string().min(1, "Booking not found"),
  rating: z.coerce
    .number({ message: "Pick a star rating" })
    .int("Pick a star rating")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(800, "Review is too long").optional().default(""),
});

/**
 * Leave a review after a COMPLETED booking.
 * Double-sided: the client reviews the caretaker; the caretaker reviews the
 * client (experience, reliability and payment behaviour). Each side may post
 * exactly one review per booking (DB unique on bookingId+authorId).
 */
export async function createReviewAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/dashboard");

  const parsed = reviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) return { error: "Booking not found" };

  const isClient = booking.clientId === user.id;
  const isWorker = booking.workerId === user.id;
  if (!isClient && !isWorker) return { error: "You were not part of this booking" };
  if (booking.status !== "COMPLETED") {
    return { error: "Reviews can only be left after a completed booking" };
  }

  const targetId = isClient ? booking.workerId : booking.clientId;

  const existing = await prisma.review.findUnique({
    where: { bookingId_authorId: { bookingId: booking.id, authorId: user.id } },
  });
  if (existing) return { error: "You have already reviewed this booking" };

  await prisma.review.create({
    data: {
      bookingId: booking.id,
      authorId: user.id,
      targetId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/profile/${targetId}`);
  return { ok: true };
}

/** Average rating + count for a user (used across cards and profiles). */
export async function getRatingFor(userId: string): Promise<{
  average: number;
  count: number;
}> {
  const agg = await prisma.review.aggregate({
    where: { targetId: userId },
    _avg: { rating: true },
    _count: true,
  });
  return { average: agg._avg.rating ?? 0, count: agg._count };
}
