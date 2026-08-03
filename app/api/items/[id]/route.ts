import { NextResponse } from "next/server";
import { isEditor } from "@/lib/auth";
import { deleteItem, updateItem } from "@/lib/store";
import { parseItemInput } from "@/lib/types";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  if (!(await isEditor())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const input = parseItemInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "An item needs a name." }, { status: 400 });
  }

  const { id } = await params;
  const item = await updateItem(id, input);
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await isEditor())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const { id } = await params;
  if (!(await deleteItem(id))) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
