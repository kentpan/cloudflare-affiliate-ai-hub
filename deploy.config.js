// deploy.config.js — Cloudflare Pages 通用部署配置
//
// GitHub Actions 工作流(.github/workflows/pages-deploy.yml)会读取此文件,
// 自动设置构建/部署参数。**不同项目只需修改此文件,无需改动工作流。**
//
// 规则:
//   - projectName:      必填, 为空则工作流报错退出
//   - buildCommand:     项目构建命令(默认 "npm run build")
//   - pagesBuildCommand:Cloudflare Pages 适配构建命令(默认 next-on-pages)
//   - outputDir:        部署输出目录(默认 ".vercel/output/static")
//   - dataToPublic:     可选, 部署时把本地数据目录复制到 public/ 随站点发布
//                       (如 { source: ".data", target: "public/data" })
//   - staticExclude:    可选, 需要绕过 worker 直接命中静态文件的路径(数组)
//   - buildEnv:         可选, 构建时需要注入的环境变量(key → value)
//   - secrets:          可选, 需要写入 Pages 项目的 secret 映射:
//                       { "GITHUB_SECRET_NAME": "PAGES_SECRET_NAME" }
//   - d1Name / d1Id:    可选, D1 数据库绑定
//   - kvName / kvId:    可选, KV 命名空间绑定
//
// 读取方式(工作流中, 使用 node --input-type=commonjs 读取 ESM 文件):
//   node --input-type=commonjs -e "console.log(require('./deploy.config.js').projectName)"
//
// 注意: 由于 package.json 设置了 "type": "module", 此文件使用 export default,
// 工作流中通过动态 import() 读取。

export default {
  // ── 必填:Cloudflare Pages 项目名称 ──
  projectName: 'affiliate-ai-hub',

  // ── 构建配置(默认适配 Next.js + @cloudflare/next-on-pages) ──
  buildCommand: 'npm run build',
  pagesBuildCommand: 'npx @cloudflare/next-on-pages@1',
  outputDir: '.vercel/output/static',

  // ── 数据目录:构建时复制到 public/ 随站点部署(affiliate-ai-hub 的 .data 数据) ──
  // 目标:让 /data/* 直接命中静态文件,不依赖 GitHub API、无限流。
  dataToPublic: { source: '.data', target: 'public/data' },

  // ── 重建 index.json(可选) ──
  // 启用后, 部署前运行 scripts/rebuild-index.mjs 扫描实际数据目录,
  // 重建完整的 dates 列表(修复上升最快/新上榜/趋势对比因 index.json 缺日期而为空的问题)。
  // 值为 index.json 重建脚本的相对路径; 设置为 '' 或删除则跳过。
  rebuildIndexScript: 'scripts/rebuild-index.mjs',

  // ── 静态路由排除:这些路径绕过 worker 直接命中静态文件 ──
  staticExclude: ['/data/*'],

  // ── 构建时需要注入的环境变量 ──
  // 支持占位符 {GITHUB_REPOSITORY}, 部署时替换为实际仓库名。
  buildEnv: {
    NEXT_PUBLIC_GIT_REPO: '{GITHUB_REPOSITORY}',
    NEXT_PUBLIC_DATA_URL: 'https://raw.githubusercontent.com/{GITHUB_REPOSITORY}/main',
  },

  // ── 需要写入 Pages 项目的 secrets(工作流 env 中声明的 secret → Pages 变量名) ──
  // 值为 Pages 端使用的变量名;工作流会从同名 job env 读取值写入。
  secrets: {
    ENCRYPTION_KEY: 'ENCRYPTION_KEY',
    ADMIN_SECRET: 'ADMIN_SECRET',
    // GH_TOKEN(GitHub PAT)写入 Pages 作为 GITHUB_TOKEN,供 AI选品按钮触发工作流
    GH_TOKEN: 'GITHUB_TOKEN',
    // DEMO_TOKEN(可逗号分隔多个)写入 Pages,供演示用户登录
    DEMO_TOKEN: 'DEMO_TOKEN',
  },

  // ── 运行时环境变量:凭证面板需要(wrangler pages secret put 写入) ──
  // 由工作流自动解析账号后写入,无需在此手动配置。
  runtimeSecrets: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_PAGES_PROJECT'],

  // ── D1 / KV(可选, 本项目不需要, 留空跳过) ──
  d1Name: '',
  kvName: '',
  d1Id: '',
  kvId: '',
}
