# 联盟 AI 自动选品与分发系统 (Affiliate AI Hub)

多平台联盟营销 AI 智能选品、种草文案生成与多维度聚合分析系统。覆盖 **Amazon / 淘宝客 / 京东 / Google** 四大平台，用 AI（z-ai-web-dev-sdk LLM）进行智能评分与种草文案生成，按平台 / 类目 / 佣金 / 价格四维度聚合，结果落地 `.data/` 目录，前端仪表盘展示选品结果。

## 技术栈

- **前端**: Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4 + shadcn/ui + recharts
- **AI 推理**: z-ai-web-dev-sdk (LLM Chat Completions)
- **数据源**: 各联盟官方 API（无凭证时自动降级到 mock）
- **运行时**: Node 20 + Bun
- **CI/CD**: GitHub Actions

## 目录结构（Monorepo）

```
affiliate-ai-hub/
├── .github/
│   └── workflows/
│       ├── daily-picker.yml     # 每日 AI 选品 + 提交 .data
│       └── deploy-pages.yml     # Web 构建部署（兜底）
├── .data/                        # 每日选品结果（被 git 跟踪）
│   ├── index.json                # 全局索引：日期列表、统计摘要
│   ├── generation-log.json       # 生成日志
│   └── {date}/
│       ├── amazon.json
│       ├── taobao.json
│       ├── jd.json
│       ├── google.json
│       ├── summary.json          # 当日跨平台聚合 + topPicks
│       └── dimensions/
│           ├── by-platform.json
│           ├── by-category.json
│           ├── by-commission.json
│           └── by-price-range.json
├── scripts/                      # 独立 Node TypeScript 后端（GitHub Actions 运行）
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # 选品入口 (tsx src/index.ts)
│       └── seed.ts               # 种子数据生成
├── web/                          # Next.js 16 仪表盘
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── prisma/
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # 主仪表盘
│       │   ├── layout.tsx
│       │   └── api/
│       │       ├── data/         # 数据读取 API
│       │       ├── generate/     # 触发选品 API
│       │       └── logs/
│       ├── components/
│       │   ├── ui/               # shadcn/ui 组件
│       │   └── affiliate/        # 业务组件
│       └── lib/
│           ├── affiliate/        # 核心领域逻辑（共享）
│           │   ├── types.ts
│           │   ├── config.ts
│           │   ├── llm-client.ts     # LLM 客户端 + 并发限制重试 (3s×10)
│           │   ├── analyzer.ts       # AI 选品分析
│           │   ├── generator.ts      # 选品编排器
│           │   ├── aggregator.ts     # 维度聚合
│           │   ├── data-writer.ts    # .data 读写
│           │   ├── seed.ts           # 种子逻辑
│           │   ├── api-client.ts     # 前端 fetch 封装
│           │   └── adapters/         # 平台适配器
│           │       ├── base.ts
│           │       ├── amazon.ts
│           │       ├── taobao.ts
│           │       ├── jd.ts
│           │       ├── google.ts
│           │       └── mock-catalog.ts
│           ├── db.ts
│           └── utils.ts
├── package.json                  # 工作区根
├── .env.example
├── .gitignore
└── README.md
```

## 快速开始

### 🚀 GitHub Actions 零配置运行（推荐）

**下载压缩包 → 提交到 GitHub → 自动运行，无需任何设置！**

1. 下载 `affiliate-ai-hub-vX.Y.Z.tar.gz` 并解压
2. `cd affiliate-ai-hub && git init && git add . && git commit -m "init"`
3. `git remote add origin https://github.com/你/affiliate-ai-hub.git && git push -u origin main`
4. GitHub Actions 自动运行：
   - **每日北京时间 08:00**：`daily-picker.yml` 自动选品 + 提交 `.data/`
   - **每次 push**：`deploy-pages.yml` 自动构建检查
5. **无需配置任何 Secrets** — 无 `LLMAI_APIKEY` 时自动用启发式模式生成选品（设置该 Secret 后自动切换为 AI 模式）

> 💡 **手动运行时输入 API Key**：在 Actions → Daily Affiliate AI Picker → Run workflow 时，表单提供 3 个输入：
> - `Target date`（可选，默认今天）
> - `LLMAI_APIKEY`（可选，留空则用 repo Secret 或启发式模式）
> - `Use LLM for AI analysis`（可选，默认自动检测：有 key 则 true）
>
> 手动输入的 key 优先于 repo Secret，适合临时测试不同 key 的场景。

> 🔄 **数据覆盖规则**：同一日期的数据会被覆盖更新。无论是手动执行（workflow_dispatch）、定时任务（每日 08:00）、还是 main 分支 push 触发的选品，都会用最新结果**覆盖当天**的 `.data/{date}/` 数据。历史日期的数据保持不变（每天一个独立目录）。

> 🔧 **Node 版本**：两个 workflow 使用 Node v22 LTS（满足 ≥ v20 要求，避免 GitHub Actions Node 20 弃用警告）。

### ☁️ Cloudflare Pages 部署（可选）

**重要：Cloudflare Pages 只负责构建前端 + 部署，不需要任何 LLMAI_APIKEY 或联盟 API 密钥！**

选品数据由 GitHub Actions 的 `daily-picker.yml` 在 GitHub 服务器上生成，提交到 `.data/` 目录。Cloudflare Pages 只需用最新 `.data/` 构建前端并部署。

#### 方式一：GitHub Actions 自动部署（推荐）

`daily-picker.yml` 已内置 `deploy` job，会在选品完成后自动构建并部署到 Cloudflare Pages。

**配置步骤**：
1. 在 Cloudflare Dashboard 创建 Pages 项目（项目名 `affiliate-ai-hub`）
2. 获取 API Token：Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" 模板（或自定义，勾选 Pages:Edit）
3. 获取 Account ID：Cloudflare Dashboard 右侧栏 → Account ID
4. 在 GitHub 仓库添加 Secrets：
   - `Settings → Secrets and variables → Actions → New repository secret`
   - `CLOUDFLARE_API_TOKEN` = 你的 API Token
   - `CLOUDFLARE_ACCOUNT_ID` = 你的 Account ID
5. 完成！每次 daily-picker 运行后会自动部署到 Cloudflare Pages

> ⚠️ **不要**在 Cloudflare Pages 的 Git 集成中配置构建命令/输出目录 —— 部署完全由 GitHub Actions 的 `deploy` job 处理。如果你已经配置了 Cloudflare Git 集成，建议在 Cloudflare Dashboard 中断开 Git 连接，避免重复构建。

#### 方式二：Cloudflare Pages Git 集成（不推荐，复杂）

如果你想用 Cloudflare 自己的 Git 集成构建，配置如下：

| 字段 | 值 |
|------|-----|
| Framework preset | `Next.js` |
| Build command | `cd web && npm ci && npm run build` |
| Build output directory | `web/.next/standalone` |
| Root directory | （留空） |
| Environment variables | **不需要任何变量**（LLMAI_APIKEY 等只在 GitHub Actions 用） |

> ⚠️ 方式二的问题：GitHub Actions 提交的 `.data/` push 不会触发 Cloudflare Git 集成（CF 视 GitHub Actions bot 的 push 为非用户操作）。因此推荐用方式一。

### 🏗️ 架构说明：数据流向

```
GitHub Actions (daily-picker.yml)
  ├─ pick job: 抓取商品 + AI 评分 → 生成 .data/{date}/
  │   └─ 需要 LLMAI_APIKEY（可选）+ 联盟 API 凭证（可选）
  │   └─ 无凭证时自动用 mock + 启发式模式
  ├─ git commit + push .data/ 到 main
  └─ deploy job: 用最新 .data/ 构建 web → 部署 Cloudflare Pages
      └─ 不需要任何 API 密钥（只是 npm build + wrangler deploy）
```

**关键点**：LLMAI_APIKEY 等密钥只在 GitHub Actions 的 `pick` job 中使用（生成选品数据）。Cloudflare Pages 部署阶段不需要任何密钥——它只是把已经生成好的 `.data/` 打包进前端并发布。

### 本地开发

```bash
# 在仓库根目录
npm run dev          # 启动 Next.js 仪表盘 (http://localhost:3000)
npm run seed         # 生成 3 天种子数据（首次运行）
npm run picker       # 手动触发一轮 AI 选品
```

首次访问 `http://localhost:3000` 时，仪表盘会自动检测到无数据并触发种子生成（无需手动 seed）。

### 生产部署

1. 推送到 GitHub（Actions 自动运行，零配置）
2. 可选：配置 GitHub Secrets 启用 AI/真实联盟 API（见下方清单）
3. 可选：连接 Vercel/Cloudflare Pages（自动检测 Next.js，零配置部署）

## 环境变量

参考 `.env.example`。关键变量：

| 变量 | 必填 | 说明 |
|------|------|------|
| `LLMAI_APIKEY` | 是 | AI 推理密钥 |
| `LLMAI_MODEL` | 否 | 默认 `glm-5.2` |
| `AMZ_ACCESS_KEY` / `AMZ_SECRET_KEY` / `AMZ_PARTNER_TAG` | 否 | Amazon PA-API |
| `TBK_APP_KEY` / `TBK_APP_SECRET` / `TBK_ADZONE_ID` | 否 | 淘宝客 |
| `JD_APP_KEY` / `JD_APP_SECRET` / `JD_ACCESS_TOKEN` | 否 | 京东联盟 |
| `GOOGLE_API_KEY` / `GOOGLE_CSE_ID` | 否 | Google CSE |
| `RECEIVE_URL` / `RECEIVE_TOKEN` | 否 | 推送目标 |
| `DATA_DIR` | 否 | 数据目录，默认 `../.data`（相对 web/） |

> 无联盟 API 凭证时，各 adapter 自动降级到 mock 数据生成器（25 个真实商品种子），系统完全可运行。

## AI 选品流程

1. **抓取**: 四平台 adapter 并行抓取候选商品（官方 API 或 mock）
2. **AI 分析**: LLM 对每件商品生成评分 (0-100)、种草文案、标签、推荐理由
   - 评分权重：预期收益 40% + 销量 25% + 评分 20% + 优惠券 15%
   - 品类平衡：单品类不超过总数 30%
   - **并发限制重试**：LLM 返回 `concurrency limit exceeded` 时，隔 3 秒重试，最多 10 次
3. **聚合**: 按平台 / 类目 / 佣金区间 / 价格区间四维度聚合
4. **落地**: 写入 `.data/{date}/` 目录 + 更新全局索引
5. **推送**: POST 聚合结果到 `RECEIVE_URL`

## GitHub Secrets 清单

- `LLMAI_APIKEY` (必填)
- `LLMAI_BASE_URL` / `LLMAI_MODEL` (可选)
- `AMZ_ACCESS_KEY` / `AMZ_SECRET_KEY` / `AMZ_PARTNER_TAG` / `AMZ_MARKETPLACE`
- `TBK_APP_KEY` / `TBK_APP_SECRET` / `TBK_ADZONE_ID` / `TBK_PID`
- `JD_APP_KEY` / `JD_APP_SECRET` / `JD_ACCESS_TOKEN` / `JD_SITE_ID`
- `GOOGLE_API_KEY` / `GOOGLE_CSE_ID`
- `RECEIVE_URL` / `RECEIVE_TOKEN`

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/data/index` | 全局索引 |
| GET | `/api/data/dates` | 可用日期列表 |
| GET | `/api/data/summary?date=` | 当日汇总 |
| GET | `/api/data/dimension?date=&name=` | 维度聚合 |
| GET | `/api/data/platform?date=&platform=` | 单平台商品 |
| GET | `/api/logs` | 生成日志 |
| POST | `/api/generate` | 触发选品 |

## 注意事项

- Amazon PA-API 要求 180 天内有合格销售，否则暂停
- 淘宝联盟高级权限邀约制
- 京东 access_token 1 年到期需重新授权
- Google Custom Search 免费额度 100 次/天
- LLM 并发限制重试依赖错误消息包含 `concurrency limit exceeded`
