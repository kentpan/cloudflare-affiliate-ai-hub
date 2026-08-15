// POST /api/auth/login — verify a token (ADMIN_SECRET or DEMO_TOKEN) and set auth cookie.
//
// Request:  { "token": "<user-entered-token>" }
// Response: { "ok": true, "role": "admin"|"demo" } on success,
//            { "ok": false, "error": "..." } on failure
//
// On success, sets the `affiliate_auth` cookie (httpOnly, 30 days) to
// "<role>:hex(SHA-256(token + salt))".

export const runtime = "edge";

import { NextResponse } from "next/server";
import {
  computeAuthCookieValue,
  AUTH_COOKIE_NAME,
  validateLoginToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  const hasAdmin = !!process.env.ADMIN_SECRET;
  const hasDemo = (process.env.DEMO_TOKEN || "").split(",").some((t) => t.trim());

  if (!hasAdmin && !hasDemo) {
    // No auth configured — no login needed
    return NextResponse.json(
      { ok: false, error: "No authentication configured (ADMIN_SECRET / DEMO_TOKEN)" },
      { status: 400 },
    );
  }

  let body: { token?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const provided = body.token || "";
  if (!provided) {
    return NextResponse.json(
      { ok: false, error: "Token is required" },
      { status: 400 },
    );
  }

  const result = await validateLoginToken(provided);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 },
    );
  }

  // Compute the auth cookie value with role prefix
  const cookieValue = await computeAuthCookieValue(provided);

  // Set cookie (30 days, httpOnly, sameSite=lax)
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const response = NextResponse.json({ ok: true, role: result.role });
  response.headers.set(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=${result.role}:${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
  return response;
}
