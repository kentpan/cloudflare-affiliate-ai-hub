// GET  /api/config       — read customization config (directions + keywords)
// PUT  /api/config       — update customization config
// POST /api/config?action=reset — reset to defaults

import { NextResponse } from "next/server";
import {
  readConfig,
  writeConfig,
  DEFAULT_CONFIG,
} from "@/lib/affiliate/customization";
import type { CustomizationConfig } from "@/lib/affiliate/customization";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readConfig());
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  let body: Partial<CustomizationConfig>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  if (searchParams.get("action") === "reset") {
    writeConfig(DEFAULT_CONFIG);
    return NextResponse.json({ ok: true, config: DEFAULT_CONFIG });
  }

  // Basic validation
  if (body.directions && !Array.isArray(body.directions)) {
    return NextResponse.json({ error: "directions must be array" }, { status: 400 });
  }
  for (const d of body.directions ?? []) {
    if (!d.id || !d.name) {
      return NextResponse.json({ error: "each direction needs id+name" }, { status: 400 });
    }
  }

  const current = readConfig();
  const next: CustomizationConfig = {
    ...current,
    ...body,
    directions: body.directions ?? current.directions,
    globalKeywords: body.globalKeywords ?? current.globalKeywords,
    platformKeywords: body.platformKeywords ?? current.platformKeywords,
  };
  writeConfig(next);
  return NextResponse.json({ ok: true, config: next });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") === "reset") {
    writeConfig(DEFAULT_CONFIG);
    return NextResponse.json({ ok: true, config: DEFAULT_CONFIG });
  }
  return NextResponse.json({ error: "use PUT to update, or ?action=reset" }, { status: 405 });
}
