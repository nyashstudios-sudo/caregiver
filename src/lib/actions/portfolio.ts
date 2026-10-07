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

const itemSchema = z.object({
  title: z.string().trim().min(3, "Give the work a title (3+ characters)"),
  description: z.string().trim().max(800, "Description is too long").optional().default(""),
  category: z.string().trim().max(60).optional().default(""),
  clientName: z.string().trim().max(80).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  projectUrl: z
    .string()
    .trim()
    .url("Link must be a valid URL")
    .optional()
    .or(z.literal(""))
    .default(""),
  mediaUrl: z.string().trim().max(500).optional().default(""),
  completedAt: z.string().trim().optional().default(""),
});

/**
 * Add a portfolio piece — the marketing layer workers use to prove their
 * craft (photos of past jobs, case studies, client names).
 */
export async function addPortfolioItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireSession("/worker");
  if (user.role !== "WORKER") {
    return { error: "Only worker accounts maintain a portfolio" };
  }

  const parsed = itemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    clientName: formData.get("clientName") ?? "",
    location: formData.get("location") ?? "",
    projectUrl: formData.get("projectUrl") ?? "",
    mediaUrl: formData.get("mediaUrl") ?? "",
    completedAt: formData.get("completedAt") ?? "",
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const d = parsed.data;
  const completedAt = d.completedAt ? new Date(`${d.completedAt}-01-01`) : null;
  if (completedAt && Number.isNaN(completedAt.getTime())) {
    return { error: "Project date doesn't look valid" };
  }

  const count = await prisma.portfolioItem.count({ where: { workerId: user.id } });
  if (count >= 30) return { error: "Portfolio is capped at 30 pieces — remove one first" };

  await prisma.portfolioItem.create({
    data: {
      workerId: user.id,
      title: d.title,
      description: d.description || null,
      category: d.category || null,
      mediaUrl: d.mediaUrl || null,
      clientName: d.clientName || null,
      location: d.location || null,
      projectUrl: d.projectUrl || null,
      completedAt,
      sortOrder: count,
    },
  });

  revalidatePath("/worker");
  redirect("/worker?portfolio=added");
}

/** Remove one of your own portfolio pieces (admins may remove any). */
export async function deletePortfolioItemAction(formData: FormData): Promise<void> {
  const user = await requireSession("/worker");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/worker?portfolio=missing");

  const item = await prisma.portfolioItem.findUnique({
    where: { id },
    select: { workerId: true },
  });
  if (!item) redirect("/worker?portfolio=missing");
  if (item.workerId !== user.id && user.role !== "ADMIN") {
    redirect("/worker?portfolio=forbidden");
  }

  await prisma.portfolioItem.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/worker");
  redirect("/worker?portfolio=removed");
}
