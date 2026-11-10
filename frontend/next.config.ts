import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/agent/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
