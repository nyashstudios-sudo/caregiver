/**
 * Platform-wide settings (monetization) stored in the database and editable
 * from /admin/payments. Env vars stay the fallback so a fresh deploy works
 * before anyone touches the admin UI.
 */

import { prisma } from "./prisma";

const cache = new Map<string, { value: string; at: number }>();
const TTL_MS = 30_000;

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    const value = row?.value ?? fallback;
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch {
    return fallback;
  }
}

export async function setSetting(
  key: string,
  value: string,
  updatedById: string | null
): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value, updatedById },
    create: { key, value, updatedById },
  });
  cache.set(key, { value, at: Date.now() });
}

/** Effective platform commission in % (DB override → env → default10). */
export async function getPlatformFeePct(): Promise<number> {
  const raw = Number(await getSetting("platformFeePct", process.env.PLATFORM_FEE_PCT ?? "10"));
  if (!Number.isFinite(raw) || raw < 0 || raw > 50) return 10;
  return raw;
}
