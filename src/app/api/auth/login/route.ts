// POST /api/auth/login — verify ADMIN_SECRET and set auth cookie.
//
// Request:  { "secret": "<user-entered-admin-secret>" }
// Response: { "ok": true } on success, { "ok": false, "error": "..." } on failure
//
// On success, sets the `affiliate_auth` cookie (httpOnly, 30 days) to
// hex(SHA-256(ADMIN_SECRET + "affiliate-ai-hub-v1")).

export const runtime = "edge";

import { NextResponse } from "next/server";
import { computeAuthCookieValue, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    // No secret configured — no login needed
    return NextResponse.json(
      { ok: false, error: "ADMIN_SECRET not configured" },
      { status: 400 },
    );
  }

  let body: { secret?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const provided = body.secret || "";
  if (!provided) {
    return NextResponse.json(
      { ok: false, error: "Secret is required" },
      { status: 400 },
    );
  }

  if (provided !== adminSecret) {
    return NextResponse.json(
      { ok: false, error: "Invalid secret" },
      { status: 401 },
    );
  }

  // Compute the auth cookie value
  const cookieValue = await computeAuthCookieValue(adminSecret);

  // Set cookie (30 days, httpOnly, sameSite=lax)
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
  return response;
}
