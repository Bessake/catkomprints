import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Smaller production output for Hostinger VPS / Node hosting
  output: "standalone",
};

export default nextConfig;
