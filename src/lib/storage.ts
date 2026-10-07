import fs from "fs/promises";
import path from "path";

const LOCAL_ROOT = path.join(process.cwd(), ".uploads");

/**
 * File storage driver (readme §2).
 *
 * Primary: Supabase Storage — used whenever the Supabase env vars are present.
 * Fallback: local disk under `.uploads/`, served through `/api/files/*`, so the
 * app still works without cloud credentials.
 */
export async function uploadObject(
  key: string,
  data: Uint8Array<ArrayBuffer>,
  contentType: string
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.STORAGE_BUCKET || "caregiver-uploads";

  if (supabaseUrl && serviceKey) {
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${key}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: data,
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Storage upload failed (${res.status}) ${detail}`);
    }
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
  }

  // Local fallback driver.
  const target = safeLocalPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return `/api/files/${key}`;
}

/** Rejects path traversal for locally stored files. */
export function safeLocalPath(key: string): string {
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return target;
}

export function mimeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
