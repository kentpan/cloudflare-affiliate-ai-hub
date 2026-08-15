// POST /api/generate — trigger AI selection pipeline.
// On Cloudflare Pages (edge), data generation happens in GitHub Actions (daily-picker.yml).
// This route triggers that workflow via GitHub repository_dispatch API, using GH_TOKEN
// that was written to the Pages project at deploy time (see pages-deploy.yml).
// On local dev (Node.js), this route runs in Node.js and can generate data directly.

export const runtime = "edge";

import { NextResponse } from "next/server";

export const maxDuration = 300;

// GitHub repository_dispatch: triggers daily-picker.yml (on.repository_dispatch.types: [run-picker])
async function triggerDailyPicker(repo: string, token: string, date?: string) {
  const url = `https://api.github.com/repos/${repo}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "affiliate-ai-hub",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      event_type: "run-picker",
      client_payload: {
        date: date ?? "",
        requested_by: "web",
      },
    }),
  });
  return res;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";

  // 优先走 GitHub Actions 触发(生产/边缘环境)
  const repo = process.env.GITHUB_REPOSITORY ?? process.env.NEXT_PUBLIC_GIT_REPO ?? "";
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

  if (repo && token) {
    try {
      const res = await triggerDailyPicker(repo, token, date);
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          triggered: true,
          message:
            "已触发 GitHub Actions (daily-picker.yml) 执行 AI 选品。执行完成后会自动重新部署到 Cloudflare Pages,整个过程约需几分钟。",
        });
      }
      const body = await res.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        triggered: false,
        error: `GitHub API 触发失败 (HTTP ${res.status}): ${body.slice(0, 300)}`,
      }, { status: 502 });
    } catch (e) {
      return NextResponse.json({
        ok: false,
        triggered: false,
        error: `GitHub API 调用异常: ${e instanceof Error ? e.message : String(e)}`,
      }, { status: 502 });
    }
  }

  // 无 GH_TOKEN 时给出明确指引
  const missing: string[] = [];
  if (!repo) missing.push("GITHUB_REPOSITORY");
  if (!token) missing.push("GH_TOKEN (永久 GitHub PAT)");
  return NextResponse.json({
    ok: false,
    triggered: false,
    error:
      `无法触发 AI 选品:缺少 ${missing.join(", ")}。` +
      `说明:GitHub Actions 自动生成的 GITHUB_TOKEN 是临时令牌(1 小时后过期),无法在 Cloudflare Pages 长期使用。` +
      `请在 GitHub Repo → Settings → Secrets → Actions 添加 GH_TOKEN(手动创建、永久的 PAT,需 repo + workflow 权限),然后重新部署 pages-deploy.yml。` +
      `配置后按钮即可直接触发 daily-picker 工作流;未配置时仍可每天 08:00 自动执行。`,
  }, { status: 500 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") === "seed") {
    return NextResponse.json({
      ok: false,
      error: "Seeding is done by GitHub Actions or local dev. On Cloudflare Pages, data is read-only.",
    });
  }
  return NextResponse.json({ ok: false, error: "use POST" }, { status: 405 });
}
