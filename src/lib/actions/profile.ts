"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export type ProfileState = { error?: string } | null;

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}

async function requireWorker() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/worker");
  if (user.role !== "WORKER" && user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  location: z.string().trim().min(1, "Please enter your location"),
  bio: z.string().trim().max(1000, "Bio is too long").optional().default(""),
  avatarUrl: z.string().trim().optional().default(""),
  hourlyRate: z.coerce
    .number({ message: "Hourly rate must be a number" })
    .min(0, "Hourly rate cannot be negative")
    .max(1000, "Hourly rate looks too high"),
  yearsExperience: z.coerce
    .number({ message: "Years of experience must be a number" })
    .min(0, "Years of experience cannot be negative")
    .max(80, "Years of experience looks too high"),
  skillsSummary: z.string().trim().max(1000, "Skills summary is too long").optional().default(""),
  hasFirstAid: z.boolean().default(false),
  isCertifiedMassage: z.boolean().default(false),
});

/** Worker portal: update profile + caretaker details (rates, skills, badges). */
export async function updateWorkerProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireWorker();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    location: formData.get("location"),
    bio: formData.get("bio") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
    hourlyRate: formData.get("hourlyRate"),
    yearsExperience: formData.get("yearsExperience"),
    skillsSummary: formData.get("skillsSummary") ?? "",
    hasFirstAid: formData.get("hasFirstAid") === "on",
    isCertifiedMassage: formData.get("isCertifiedMassage") === "on",
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const d = parsed.data;

  const existing = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { caretakerDetails: true },
  });

  if (!existing) {
    await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: d.fullName,
        location: d.location,
        bio: d.bio || null,
        avatarUrl: d.avatarUrl || null,
        caretakerDetails: {
          create: {
            hourlyRate: d.hourlyRate,
            yearsExperience: d.yearsExperience,
            hasFirstAid: d.hasFirstAid,
            isCertifiedMassage: d.isCertifiedMassage,
            skillsSummary: d.skillsSummary || null,
          },
        },
      },
    });
    redirect("/worker?saved=1");
  }

  await prisma.profile.update({
    where: { id: existing.id },
    data: {
      fullName: d.fullName,
      location: d.location,
      bio: d.bio || null,
      // keep an existing avatar unless the form supplied a new one
      avatarUrl: d.avatarUrl || existing.avatarUrl,
    },
  });

  if (existing.caretakerDetails) {
    await prisma.caretakerDetails.update({
      where: { id: existing.caretakerDetails.id },
      data: {
        hourlyRate: d.hourlyRate,
        yearsExperience: d.yearsExperience,
        hasFirstAid: d.hasFirstAid,
        isCertifiedMassage: d.isCertifiedMassage,
        skillsSummary: d.skillsSummary || null,
      },
    });
  } else {
    await prisma.caretakerDetails.create({
      data: {
        profileId: existing.id,
        hourlyRate: d.hourlyRate,
        yearsExperience: d.yearsExperience,
        hasFirstAid: d.hasFirstAid,
        isCertifiedMassage: d.isCertifiedMassage,
        skillsSummary: d.skillsSummary || null,
      },
    });
  }

  redirect("/worker?saved=1");
}

const certSchema = z.object({
  title: z.string().trim().min(2, "Give the certificate a title"),
  documentUrl: z.string().trim().min(1, "Upload the certificate document first"),
  issuedAt: z.string().trim().optional().default(""),
});

/** Attach a certification document (uploaded to file storage) to the worker. */
export async function addCertificationAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireWorker();

  const parsed = certSchema.safeParse({
    title: formData.get("title"),
    documentUrl: formData.get("documentUrl"),
    issuedAt: formData.get("issuedAt") ?? "",
  });
  if (!parsed.success) return { error: zodError(parsed.error) };

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { caretakerDetails: true },
  });
  if (!profile) return { error: "Save your worker profile first" };

  let details = profile.caretakerDetails;
  if (!details) {
    details = await prisma.caretakerDetails.create({
      data: { profileId: profile.id, hourlyRate: 15, yearsExperience: 0 },
    });
  }

  const issuedAt = parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null;
  await prisma.certification.create({
    data: {
      caretakerDetailsId: details.id,
      title: parsed.data.title,
      documentUrl: parsed.data.documentUrl,
      issuedAt: issuedAt && !Number.isNaN(issuedAt.getTime()) ? issuedAt : null,
    },
  });

  redirect("/worker?cert=added");
}

/** Remove one of the worker's own certifications. */
export async function deleteCertificationAction(formData: FormData): Promise<void> {
  const user = await requireWorker();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/worker");

  const cert = await prisma.certification.findUnique({
    where: { id },
    include: { caretakerDetails: { include: { profile: true } } },
  });
  if (!cert) redirect("/worker?cert=missing");

  const ownerId = cert.caretakerDetails.profile.userId;
  if (ownerId !== user.id && user.role !== "ADMIN") redirect("/worker?cert=forbidden");

  await prisma.certification.delete({ where: { id } });
  redirect("/worker?cert=removed");
}
