import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { getSiteConfig } from "@/lib/config";
import { checkDatabase, storageMode } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Writes and immediately removes a tiny file, to distinguish "the token exists"
 * from "the store actually accepts writes". Only runs with ?probe=1.
 */
async function probeBlob(): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return "not-configured";
  try {
    const blob = await put("health/probe.txt", "ok", {
      access: "public",
      contentType: "text/plain",
      allowOverwrite: true,
    });
    await del(blob.url);
    return "writable";
  } catch (error) {
    return `error: ${error instanceof Error ? error.message : "unknown"}`;
  }
}

/**
 * Reports whether each store and setting is wired up. Only presence is exposed,
 * never a value, so this is safe to leave public.
 */
export async function GET(request: Request) {
  const config = getSiteConfig();
  const probe = new URL(request.url).searchParams.get("probe") === "1";

  return NextResponse.json({
    database: await checkDatabase(),
    storageMode,
    blob: probe
      ? await probeBlob()
      : process.env.BLOB_READ_WRITE_TOKEN
        ? "configured"
        : "not-configured",
    editing: process.env.EDIT_PASSWORD ? "enabled" : "disabled",
    whatsapp: config.whatsappNumber ? "configured" : "not-configured",
    paymentLinks: config.paymentLinks.length,
  });
}
