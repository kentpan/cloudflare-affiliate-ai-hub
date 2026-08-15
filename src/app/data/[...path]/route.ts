// GET /data/[...path] — serve .data/ directory files from local filesystem.
//
// Node.js runtime — uses fs/promises to read from the local .data/ directory.
// This route is for LOCAL DEVELOPMENT ONLY (fast local file access).
//
// On Cloudflare Pages: this route is DELETED before the CF Pages build
// (see .github/workflows/pages-deploy.yml → "Remove nodejs-only routes" step).
// The edge runtime cannot use node:fs, so this route cannot be deployed to
// CF Pages. In production, data-writer.ts falls back to the GitHub Contents
// API directly when this route returns 404.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = join(process.cwd(), ".data", ...path);

  try {
    const content = await readFile(filePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
