import fs from "fs/promises";
import { mimeForExtension, safeLocalPath } from "@/lib/storage";

/** Serves files written by the local-storage fallback driver. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await ctx.params;
  const key = parts.join("/");
  if (!key || key.includes("..")) {
    return new Response("Bad path", { status: 400 });
  }

  try {
    const data = await fs.readFile(safeLocalPath(key));
    const ext = key.split(".").pop() ?? "";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeForExtension(ext),
        "Content-Disposition": `inline; filename="${key.split("/").pop()}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
