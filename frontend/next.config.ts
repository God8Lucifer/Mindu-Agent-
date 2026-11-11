import type { NextConfig } from "next";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { networkInterfaces } from "node:os";

// The AI API runs inside Next.js, but OPENAI_API_KEY lives in the repo-root .env
// (Next.js only reads frontend/.env by itself). Load the root one too.
loadEnvConfig(path.resolve(__dirname, ".."));

const nextConfig: NextConfig = {
  // The QR opens this computer's LAN address on a phone during local testing.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap(entries => entries ?? [])
    .filter(entry => entry.family === 'IPv4' && !entry.internal).map(entry => entry.address),
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
