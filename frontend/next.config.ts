import type { NextConfig } from "next";

/** Where the GMC AI backend (../backend) listens. Visitors never open it directly. */
const API_URL = process.env.API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return {
      // The Mindu agent (public/agent, plain JS) is the home page.
      beforeFiles: [{ source: "/", destination: "/agent/index.html" }],
      afterFiles: [],
      // Any /api/* route not handled by this app (e.g. /api/chat, /api/transcribe,
      // /api/health) is forwarded to the AI backend.
      fallback: [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }],
    };
  },
};

export default nextConfig;
