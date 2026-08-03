import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isEditor } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Issues a short-lived token so the browser can upload straight to Blob storage.
 * Going through the serverless function instead would cap photos at the 4.5 MB
 * request body limit, which phone cameras exceed easily.
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo uploads need a Blob store: BLOB_READ_WRITE_TOKEN is not set." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isEditor())) throw new Error("Not authorised.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // The browser receives the URL directly; nothing to do server-side.
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: message === "Not authorised." ? 401 : 400 });
  }
}
