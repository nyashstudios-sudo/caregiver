import crypto from "crypto";
import { getSessionUser } from "@/lib/session";
import { uploadObject } from "@/lib/storage";

const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** POST /api/upload — stores a certificate or avatar in file storage. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return Response.json(
      { error: "Only PDF, PNG, JPG or WEBP files are allowed" },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File is too large (max 5 MB)" }, { status: 413 });
  }

  const key = `${user.id}/${crypto.randomUUID()}.${ext}`;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = await uploadObject(key, bytes, file.type);
    return Response.json({ url, key });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 502 }
    );
  }
}
