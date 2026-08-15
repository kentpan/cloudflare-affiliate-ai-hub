// GET /data/[...path] — 本地开发时静态服务 .data/ 目录文件
// 仅 Node.js 环境可用，Edge 环境不走此路由（走 GitHub raw）
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const filePath = join(process.cwd(), ".data", ...path)

  try {
    const content = await readFile(filePath, "utf-8")
    return new NextResponse(content, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
}