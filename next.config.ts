import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mount the affiliate-ai-hub dashboard under /affiliate so the main
  // Next.js gateway can proxy it transparently. All internal <Link>/fetch()/
  // asset URLs automatically inherit this prefix.
  basePath: "/affiliate",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
