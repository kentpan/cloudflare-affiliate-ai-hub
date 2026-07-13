import type { NextConfig } from "next";

// The affiliate-ai-hub dashboard is now served directly by this single server.
// No basePath, no proxy — everything runs on port 3000 at the root.
//
// The affiliate-ai-hub/ directory is kept as the canonical project source
// for packaging (tar.gz) and CF Pages deployment. In production (CF Pages),
// the affiliate app is deployed standalone at the root — same as here.

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
