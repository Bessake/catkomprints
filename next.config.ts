import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is for VPS/Docker only. On Vercel it breaks the build
  // (ENOENT next-server.js.nft.json). Vercel sets VERCEL=1.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
