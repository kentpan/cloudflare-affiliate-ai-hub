// GET /api/archive?action=list — list archived snapshots

export const runtime = "edge";
// GET /api/archive?action=run — archive old data (not supported on edge)
// GET /api/archive?action=restore&date= — restore archived date (not supported on edge)
//
// On Cloudflare Pages (edge runtime), fs operations are limited.
// Archive management is done locally or in GitHub Actions.

import { NextResponse } from "next/server";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "list";

  if (action === "list") {
    // Return empty list on edge (archives are managed locally)
    return NextResponse.json({ archives: [] });
  }

  return NextResponse.json({
    ok: false,
    error: "Archive operations (run/restore) are not supported on edge runtime. Use local dev mode or GitHub Actions.",
  });
}
