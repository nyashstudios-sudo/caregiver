"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type ContactState = { ok?: boolean; error?: string } | null;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.email({ message: "Enter a valid email address" }),
  phone: z.string().trim().optional().default(""),
  subject: z.string().trim().max(150, "Subject is too long").optional().default(""),
  message: z
    .string()
    .trim()
    .min(10, "Please tell us a bit more (at least 10 characters)")
    .max(3000, "Message is too long"),
});

/** Saves a Contact Us message. A filled honeypot silently drops spam. */
export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  if (String(formData.get("website") ?? "").length > 0) {
    return { ok: true }; // bot trap — pretend success
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    },
  });

  return { ok: true };
}
