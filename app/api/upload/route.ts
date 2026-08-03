import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isEditor } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isEditor())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images can be uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That image is too large (max 8 MB)." }, { status: 400 });
  }

  const extension = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const filename = `sale/${randomUUID()}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Photo uploads need a Blob store: BLOB_READ_WRITE_TOKEN is not set." },
      { status: 503 },
    );
  }

  // Local development without Blob storage configured: keep the file in public/.
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const localName = filename.replace("sale/", "");
  const directory = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, localName), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${localName}` });
}
