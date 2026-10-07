"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { ActionState } from "./state";

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}

const serviceSchema = z.object({
  title: z.string().trim().min(5, "Title needs at least 5 characters"),
  description: z.string().trim().min(20, "Describe the offer in at least 20 characters"),
  category: z.string().trim().min(2, "Pick a category"),
  priceKes: z.coerce
    .number({ message: "Set a price" })
    .int("Price must be whole KES")
    .min(100, "Minimum price is KES 100")
    .max(500000, "Maximum price is KES 500,000"),
  durationLabel: z.string().trim().max(60).optional().default(""),
  active: z.coerce.boolean().optional().default(true),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/**
 * Create or update a fixed-price service listing. Listings are how clients
 * book in one tap — they see the offer, the price and the worker up front.
 *
 * Publishing requires a verified email: the listing is public-facing, so the
 * account behind it must be reachable.
 */
export async function saveServiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/worker");
  if (user.role !== "WORKER") {
    return { error: "Only worker accounts publish services" };
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerifiedAt: true },
  });
  if (!account?.emailVerifiedAt) {
    return {
      error: "Verify your email before publishing services — check your inbox or /welcome.",
    };
  }

  const parsed = serviceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priceKes: formData.get("priceKes"),
    durationLabel: formData.get("durationLabel") ?? "",
    active: formData.get("active") === "off" ? false : true,
  });
  if (!parsed.success) return { error: zodError(parsed.error) };
  const d = parsed.data;

  const editingId = String(formData.get("id") ?? "");
  const existingCount = await prisma.service.count({ where: { workerId: user.id } });
  if (!editingId && existingCount >= 20) {
    return { error: "Service list is capped at 20 — remove one before adding another" };
  }

  let slug = slugify(d.title) || `service-${Date.now()}`;
  const clash = await prisma.service.findUnique({ where: { slug } });
  if (clash && clash.id !== editingId) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  if (editingId) {
    const owned = await prisma.service.findUnique({
      where: { id: editingId },
      select: { workerId: true },
    });
    if (!owned || owned.workerId !== user.id) {
      return { error: "That service doesn't belong to you" };
    }
    await prisma.service.update({
      where: { id: editingId },
      data: {
        title: d.title,
        description: d.description,
        category: d.category,
        priceKes: d.priceKes,
        durationLabel: d.durationLabel || null,
        active: d.active,
        slug,
      },
    });
    revalidatePath("/worker");
    revalidatePath("/services");
    redirect("/worker?service=updated");
  }

  await prisma.service.create({
    data: {
      workerId: user.id,
      title: d.title,
      slug,
      description: d.description,
      category: d.category,
      priceKes: d.priceKes,
      durationLabel: d.durationLabel || null,
      active: d.active,
    },
  });
  revalidatePath("/worker");
  revalidatePath("/services");
  redirect("/worker?service=created");
}

/** Toggle a listing live/off (keeps history + slug stable). */
export async function toggleServiceAction(formData: FormData): Promise<void> {
  const user = await requireSession("/worker");
  const id = String(formData.get("id") ?? "");
  if (id) {
    const svc = await prisma.service.findUnique({ where: { id }, select: { workerId: true, active: true } });
    if (svc && (svc.workerId === user.id || user.role === "ADMIN")) {
      await prisma.service.update({ where: { id }, data: { active: !svc.active } });
    }
  }
  revalidatePath("/worker");
  revalidatePath("/services");
  redirect("/worker?service=toggled");
}

/**
 * Direct-form variant for the inline editor — errors bounce back to the
 * portal with the message instead of being lost.
 */
export async function saveServiceEditAction(formData: FormData): Promise<void> {
  const res = await saveServiceAction(null, formData);
  if (res?.error) {
    redirect(`/worker?service=error&e=${encodeURIComponent(res.error)}`);
  }
  // Success paths inside saveServiceAction already redirected.
  redirect("/worker?service=updated");
}

/** Delete a service listing entirely. */
export async function deleteServiceAction(formData: FormData): Promise<void> {
  const user = await requireSession("/worker");
  const id = String(formData.get("id") ?? "");
  if (id) {
    const svc = await prisma.service.findUnique({ where: { id }, select: { workerId: true } });
    if (svc && (svc.workerId === user.id || user.role === "ADMIN")) {
      await prisma.service.delete({ where: { id } }).catch(() => undefined);
    }
  }
  revalidatePath("/worker");
  revalidatePath("/services");
  redirect("/worker?service=deleted");
}
