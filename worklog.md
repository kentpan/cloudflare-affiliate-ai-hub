# Affiliate AI Hub Project Worklog

This file tracks all work done by AI agents on the affiliate-ai-hub project.


---
Task ID: 1
Agent: main
Task: 删除沙盒空间多余文件,解压affiliate-ai-hub.zip,修改端口3000,npm安装依赖,启动服务器

Work Log:
- 停止之前运行的 dev server
- 保留目录: upload/, public/, Caddyfile, worklog.md, .zscripts/, skills/, .git/
- 删除其他所有文件: .env, .next, bun.lock, components.json, db/, dev.log, download/, eslint.config.mjs, examples/, mini-services/, next-env.d.ts, next.config.ts, node_modules/, package.json, postcss.config.mjs, prisma/, src/, tailwind.config.ts, tests/, tsconfig.json
- 解压 upload/affiliate-ai-hub.zip 到根目录
- 清理 __MACOSX 目录和 .DS_Store 文件
- 使用 npm install --legacy-peer-deps 安装依赖 (503 packages)
- 启动 dev server: setsid -f bash -c 'npm run dev > dev.log 2>&1'
- 验证: HTTP 200, 49412 bytes, 页面正确渲染
- API 端点也工作正常: /api/config, /api/data/dates, /api/trend

Stage Summary:
- 项目成功部署在 /home/z/my-project,使用 npm 而非 bun
- 端口 3000 已被占用并正常监听
- Caddyfile 默认代理到 localhost:3000 (无需修改)
- 项目名: cloudflare-affiliate-ai-hub v7.0.8
- 数据目录 .data/ 已就位 (包含历史数据)
- 启动命令模式: setsid -f bash -c '...' 用于后台持久化运行

---
Task ID: 2
Agent: main
Task: 检查.github/workflows/pages-deploy.yml和wrangler.toml,配置Cloudflare Pages自动部署

Work Log:
- 检查发现原 pages-deploy.yml 是为 Nuxt 配置的 (使用 npx nuxt build --preset=cloudflare-pages)
- 项目实际是 Next.js, 应使用 @cloudflare/next-on-pages (与 daily-picker.yml 的 deploy job 保持一致)
- 重写 pages-deploy.yml 为 Next.js 版本:
  * 触发条件: push 到 main/master 分支 (排除 .data/, *.md, *.zip)
  * 支持两种鉴权: CLOUDFLARE_API_TOKEN (推荐) 或 CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL (legacy)
  * Verify required secrets 步骤: 校验 3 个必需 secrets (Token/Key+Email, ENCRYPTION_KEY)
  * 自动解析 Account ID (优先 Variable,fallback wrangler whoami)
  * 自动解析 Pages 项目名 (优先 workflow_dispatch input,然后 Variable,默认 affiliate-ai-hub)
  * Build: npm ci → npm run build → npx @cloudflare/next-on-pages@1
  * 验证 .vercel/output/static 输出目录存在
  * 验证 wrangler.toml 包含 nodejs_compat
  * 自动创建 Pages 项目 (如不存在)
  * 配置 secrets: ENCRYPTION_KEY + ADMIN_SECRET 通过 wrangler pages secret put
  * 部署: wrangler pages deploy .vercel/output/static --project-name=$PROJECT_NAME --branch=main
  * 部署后通过 CF API 解析真实 *.pages.dev URL
- 重写 wrangler.toml:
  * pages_build_output_dir = ".vercel/output/static" (Next.js 输出目录)
  * 移除 D1 数据库绑定 (项目用 .data/ JSON 文件,通过 fetch 读取)
  * 移除 [assets] directory = ".output/public" (Nuxt 特有)
  * 移除 BASE_URL = "/admin/" (Next.js 应用在根路径)
  * 保留 compatibility_flags = ["nodejs_compat"]

Stage Summary:
- pages-deploy.yml 现已适配 Next.js + @cloudflare/next-on-pages
- 用户只需在 GitHub Secrets 中配置 3 个变量即可自动部署:
  1. CLOUDFLARE_API_TOKEN (或 CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL)
  2. ENCRYPTION_KEY
  3. ADMIN_SECRET
- wrangler.toml 简化为标准 Pages 配置 (移除 D1,assets,vars)
- 与 daily-picker.yml 的 deploy job 保持一致的工作流

---
Task ID: 3
Agent: main
Task: 修改数据获取逻辑,使用GitHub API获取文件内容,优先本地.data/

Work Log:
- 检查现有 data-writer.ts: 使用 raw.githubusercontent.com 直接获取 raw 文件内容
- 检查现有 /app/data/[...path]/route.ts: 已存在,读取本地 .data/ 目录 (nodejs runtime)
- 重写 src/lib/affiliate/data-writer.ts:
  * 新增 getGitRepo(): 解析 owner/repo (优先 NEXT_PUBLIC_GIT_REPO > NEXT_PUBLIC_DATA_URL > DEFAULT_GIT_REPO)
  * 新增 getLocalBaseUrl(): dev 返回 http://localhost:{PORT},prod 返回 NEXT_PUBLIC_APP_URL 或空
  * 新增 getGithubApiUrl(): 构建 https://api.github.com/repos/{repo}/contents/.data/{path}
  * 新增 fetchLocalJson(): 通过 /data/[...path] 路由获取本地 .data/ 文件
  * 新增 fetchGithubJson(): 使用 GitHub Contents API (Accept: application/vnd.github.raw+json, User-Agent: affiliate-ai-hub, 可选 GITHUB_TOKEN)
  * 重写 readJson(): 先 fetchLocalJson,失败再 fetchGithubJson
  * 重写 listDates(): 同样优先本地,今日数据缺失时自动 probe 今日 summary.json (会先本地后 GitHub API)
  * 保留 5 分钟内存缓存 (避免 GitHub API rate limit 60/hr 用完)
- 测试验证:
  * GET /api/data/dates → 33 个日期 (本地数据完整)
  * GET /api/data/index → 完整索引
  * GET /api/config → 完整配置
  * dev.log 显示本地 /data/*.json 命中,无 GitHub API 调用 (因为本地都有)
- 今日数据 (2026-08-15) 不在本地,代码会自动 probe GitHub API
  * 当前 GitHub API rate limit 已耗尽 (60/hr),reset 时间 23 分钟后
  * 配置 GITHUB_TOKEN 后可提升到 5000/hr
  * 实现正确:本地无数据时返回 null,代码自动 fallback 到 GitHub API

Stage Summary:
- 数据获取优先级: 本地 .data/ → GitHub Contents API
- 不再使用 raw.githubusercontent.com,改为 api.github.com/repos/{owner}/{repo}/contents/.data/{path}
- 本地数据正常服务 (33 个日期),API 端点全部 HTTP 200
- 今日数据缺失时会自动从 GitHub 获取 (受 rate limit 限制,可配 GITHUB_TOKEN 解决)

---
Task ID: 4
Agent: main
Task: .env配置PORT,package.json和next.config.ts自动读取使用PORT

Work Log:
- 在 .env 中添加 PORT=3000 (顶部)
- 在 .env 中添加 ADMIN_SECRET= 和 ENCRYPTION_KEY= (为 task 5 准备)
- 创建 start.mjs 启动包装脚本:
  * 手动解析 .env 文件 (支持引号、注释、等号)
  * 不覆盖已存在的 process.env 变量
  * 读取 PORT (默认 3000)
  * 使用 spawn 启动 `next dev -p $PORT` 或 `next start -p $PORT`
  * 支持 dev / start / build 三种命令
- 修改 package.json scripts:
  * "dev": "node start.mjs dev" (原 "next dev -p 3000")
  * "start": "node start.mjs start" (原 "next start -p 3000")
  * "build": "next build" (不变,build 不需要端口)
- 修改 next.config.ts:
  * 读取 process.env.PORT (默认 3000)
  * 通过 env.NEXT_PUBLIC_PORT 暴露给客户端代码
  * 添加 allowedDevOrigins (Next.js 16 替代 allowedHosts,详见 task 6)
- 测试验证:
  * npm run dev 正常启动,日志显示 [start.mjs] PORT=3000
  * GET / → HTTP 200
  * GET / via Caddy (port 81) → HTTP 200
  * 无 "Unrecognized key allowedHosts" 警告

Stage Summary:
- PORT 配置链路: .env → start.mjs (CLI -p flag) → next.config.ts (process.env.PORT)
- start.mjs 解决了 Next.js CLI 在解析 -p 参数前 .env 未加载的问题
- 用户只需修改 .env 中的 PORT 即可同时影响 dev 和 start 命令
- next.config.ts 也可读取 PORT 用于其他配置 (如 NEXT_PUBLIC_PORT)

---
Task ID: 5
Agent: main
Task: 页面打开时检测ADMIN_SECRET,已配置但未登录则跳转登录页面

Work Log:
- 创建 src/lib/auth.ts:
  * AUTH_COOKIE_NAME = "affiliate_auth"
  * computeAuthCookieValue(): hex(SHA-256(ADMIN_SECRET + "affiliate-ai-hub-v1")) (Web Crypto API, edge 兼容)
  * isAuthenticated(): 从 request 读取 cookie,验证是否匹配
- 创建 /api/auth/check (GET, edge):
  * 返回 { configured, authenticated }
  * ADMIN_SECRET 未配置 → { configured: false, authenticated: true } (开放模式)
  * ADMIN_SECRET 已配置 → 检查 affiliate_auth cookie 是否匹配
- 创建 /api/auth/login (POST, edge):
  * 接收 { secret } JSON
  * 验证 secret === ADMIN_SECRET
  * 成功 → 设置 affiliate_auth cookie (httpOnly, SameSite=Lax, 30天),返回 { ok: true }
  * 失败 → 401 { ok: false, error: "Invalid secret" }
- 创建 /api/auth/logout (POST, edge):
  * 清除 affiliate_auth cookie (Max-Age=0)
- 创建 src/app/login/page.tsx:
  * 单个 ADMIN_SECRET 密码输入框 (type=password)
  * Framer Motion 入场动画
  * ShieldCheck 图标 + "管理面板登录" 标题
  * 提交后调用 /api/auth/login,成功则 router.push(redirect)
  * 错误显示 toast
  * 支持 ?redirect= 参数 (默认 /)
- 修改 src/app/page.tsx:
  * 添加 useRouter, authState 状态 (null=checking, false=redirecting, true=ok)
  * 新增 useEffect: mount 时调用 /api/auth/check
    - configured && !authenticated → router.replace("/login?redirect=/")
    - 否则 → setAuthState(true)
  * 修改 bootstrap useEffect: 仅在 authState === true 时执行
  * 添加 loading screen: authState !== true 时显示 Loader2 spinner + "正在验证访问权限..."
- 测试验证 (临时设置 ADMIN_SECRET=test-secret-123):
  * GET /api/auth/check (无cookie) → { configured: true, authenticated: false } ✓
  * POST /api/auth/login { secret: "wrong" } → 401 "Invalid secret" ✓
  * POST /api/auth/login { secret: "test-secret-123" } → 200 { ok: true }, Set-Cookie ✓
  * GET /api/auth/check (带cookie) → { configured: true, authenticated: true } ✓
- 测试验证 (ADMIN_SECRET 为空,开放模式):
  * GET /api/auth/check → { configured: false, authenticated: true } ✓
  * GET / → HTTP 200 (显示验证中 spinner,然后正常加载页面) ✓
  * GET /login → HTTP 200 (登录表单可访问) ✓

Stage Summary:
- 完整的 ADMIN_SECRET 登录保护链路:
  1. 用户访问 / → 客户端调用 /api/auth/check
  2. 已配置但未登录 → 跳转 /login?redirect=/
  3. 输入正确密钥 → 设置 30天 httpOnly cookie → 跳回 /
  4. 未配置 ADMIN_SECRET → 开放模式,直接显示页面
- Cookie 安全: httpOnly (JS不可读), SameSite=Lax (防 CSRF), SHA-256 哈希 (不存储明文)
- 兼容 edge runtime (使用 Web Crypto API,无 fs 依赖)
- 用户只需在 .env 中设置 ADMIN_SECRET=xxx 即可启用登录保护

---
Task ID: 6
Agent: main
Task: 修改.zscripts/dev.sh使用npm,配置next.config.ts的allowedHosts: true,setsid

Work Log:
- 重写 .zscripts/dev.sh:
  * bun install → npm install --legacy-peer-deps --no-audit --no-fund
  * 移除 bun run db:push (项目无 Prisma/SQLite,使用 .data/ JSON)
  * bun run dev → npm run dev (通过 start.mjs 包装,自动读取 .env 的 PORT)
  * 后台启动方式: `setsid -f bash -c "cd ... && exec npm run dev" > dev.log 2>&1`
    - setsid -f 完全脱离当前 shell session,服务器在 dev.sh 退出后持续运行
    - 输出重定向到 dev.log
  * 从 .env 读取 PORT 用于健康检查 (默认 3000)
  * mini-services 也改为 npm install + npm run dev
  * 添加清晰的完成提示 (端口、日志路径、停止命令)
- next.config.ts 已在 task 4 中配置 allowedDevOrigins (Next.js 16 替代 allowedHosts):
  * allowedDevOrigins: ["*.*", "*.*.*", "*.localhost", "localhost", "127.0.0.1", "0.0.0.0"]
  * 涵盖 2段和3段域名 + 本地地址,近似 allowedHosts: true 的效果
  * 注释说明 Next.js 16 的 API 变更
- 测试验证:
  * bash .zscripts/dev.sh 成功启动
  * npm install 完成
  * setsid 启动 dev server,7秒内就绪
  * 健康检查通过 (curl localhost:3000)
  * 脚本退出后服务器持续运行 (pgrep 显示进程存活)
  * GET / → HTTP 200, GET / via Caddy → HTTP 200

Stage Summary:
- dev.sh 完全切换到 npm 工具链
- setsid -f 确保服务器持久化后台运行 (不依赖 nohup/disown)
- next.config.ts 的 allowedDevOrigins 是 Next.js 16 中 allowedHosts: true 的等效配置
- 脚本可重复执行 (重启时会启动新实例,需先 pkill 旧的)
