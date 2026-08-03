import { NextResponse } from "next/server";
import { EDIT_COOKIE, editCookieOptions, editToken, isPasswordCorrect } from "@/lib/auth";

export async function POST(request: Request) {
  if (!process.env.EDIT_PASSWORD) {
    return NextResponse.json(
      { error: "Editing is disabled: EDIT_PASSWORD is not set." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isPasswordCorrect(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(EDIT_COOKIE, editToken(), editCookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(EDIT_COOKIE, "", { ...editCookieOptions, maxAge: 0 });
  return response;
}
