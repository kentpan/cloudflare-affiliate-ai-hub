// GET /api/auth/check — check if auth is configured and if the current request
// is authenticated, plus which role it belongs to.
//
// Response: { configured: boolean, authenticated: boolean, role?: "admin"|"demo" }
//
// Authentication model:
//   - No ADMIN_SECRET and no DEMO_TOKEN → open mode (configured=false, authenticated=true, role=admin)
//   - Otherwise → protected mode (configured=true)
//     - authenticated if the `affiliate_auth` cookie matches admin or demo token
//     - role reflects which token matched

export const runtime = "edge";

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function GET(request: Request) {
  const state = await isAuthenticated(request);
  return NextResponse.json(state);
}
