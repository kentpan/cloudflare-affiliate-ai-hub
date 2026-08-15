import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────────────────
// Next.js configuration for the affiliate-ai-hub dashboard.
//
// PORT handling:
//   - PORT is read from .env (Next.js auto-loads .env before evaluating this
//     config file, so process.env.PORT is available here).
//   - The actual `-p PORT` CLI flag is set by start.mjs (which loads .env
//     before spawning `next dev` / `next start`).
//   - Default port: 3000 (matches Caddyfile default proxy target).
//
// allowedDevOrigins (Next.js 16 replacement for allowedHosts):
//   - In Next.js 15, `allowedHosts: true` allowed all hosts.
//   - In Next.js 16, this was renamed to `allowedDevOrigins: string[]` and
//     no longer accepts a boolean. To approximate "allow all", we add
//     wildcard patterns covering 2-segment and 3-segment hostnames plus
//     common local addresses.
//   - This is required for the Caddy reverse-proxy setup where the dev
//     server is reached via the gateway's domain.
// ─────────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000", 10);

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow dev server to accept requests from any Host header (Caddy reverse-proxy).
  // Next.js 16 replaced `allowedHosts: true` with `allowedDevOrigins: string[]`.
  // Wildcard patterns approximate "allow all" (2-segment + 3-segment domains).
  allowedDevOrigins: [
    "*.*",
    "*.*.*",
    "*.localhost",
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Expose PORT to runtime code via process.env.NEXT_PUBLIC_PORT
  // (client-side can read it for constructing API URLs).
  env: {
    NEXT_PUBLIC_PORT: String(PORT),
  },
};

export default nextConfig;
