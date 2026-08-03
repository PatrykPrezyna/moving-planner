import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const EDIT_COOKIE = "sale_edit";

const ONE_YEAR = 60 * 60 * 24 * 365;

function tokenFor(password: string): string {
  return createHash("sha256").update(`sale-edit:${password}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isPasswordCorrect(candidate: string): boolean {
  const expected = process.env.EDIT_PASSWORD || "";
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/** Value stored in the edit cookie once the password has been accepted. */
export function editToken(): string {
  return tokenFor(process.env.EDIT_PASSWORD || "");
}

export async function isEditor(): Promise<boolean> {
  if (!process.env.EDIT_PASSWORD) return false;
  const cookie = (await cookies()).get(EDIT_COOKIE)?.value;
  return Boolean(cookie) && safeEqual(cookie!, editToken());
}

export const editCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ONE_YEAR,
};
