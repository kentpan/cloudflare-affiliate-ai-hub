import type { NextConfig } from "next";

// basePath is conditionally enabled for local sandbox dev to avoid asset
// URL collisions with the main Next.js gateway (port 3000).
//
// - Production (Cloudflare Pages): NEXT_PUBLIC_BASE_PATH is unset → no basePath.
//   The dashboard is served at `/` directly. Asset URLs are `/_next/...`.
//
// - Sandbox dev: NEXT_PUBLIC_BASE_PATH="/affiliate" is set in .env.local.
//   basePath becomes "/affiliate". Asset URLs are `/affiliate/_next/...`.
//   The main server's rewrites forward /affiliate/* → localhost:3001/affiliate/*.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
