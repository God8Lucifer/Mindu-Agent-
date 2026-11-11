import type { NextConfig } from "next";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

// The AI API runs inside Next.js, but OPENAI_API_KEY lives in the repo-root .env
// (Next.js only reads frontend/.env by itself). Load the root one too.
loadEnvConfig(path.resolve(__dirname, ".."));

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Hide the Next.js dev badge (bottom-left "N"): it covered the map's Find button. Dev-only anyway.
  devIndicators: false,
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
