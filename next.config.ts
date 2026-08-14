import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The game has no server-only routes, so emit portable static assets for
  // Cloudflare Pages instead of a Node.js server bundle.
  output: "export",
};

export default nextConfig;
