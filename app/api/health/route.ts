import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/config";
import { checkDatabase, storageMode } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Reports whether each store and setting is wired up. Only presence is exposed,
 * never a value, so this is safe to leave public.
 */
export async function GET() {
  const config = getSiteConfig();

  return NextResponse.json({
    database: await checkDatabase(),
    storageMode,
    blob: process.env.BLOB_READ_WRITE_TOKEN ? "configured" : "not-configured",
    editing: process.env.EDIT_PASSWORD ? "enabled" : "disabled",
    whatsapp: config.whatsappNumber ? "configured" : "not-configured",
    paymentLinks: config.paymentLinks.length,
  });
}
