import { NextResponse } from "next/server";
import { isEditor } from "@/lib/auth";
import { createItem, listItems } from "@/lib/store";
import { parseItemInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: await listItems() });
}

export async function POST(request: Request) {
  if (!(await isEditor())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const input = parseItemInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "An item needs a name." }, { status: 400 });
  }

  return NextResponse.json({ item: await createItem(input) }, { status: 201 });
}
