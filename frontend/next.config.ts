import type { NextConfig } from "next";

import { env } from "./src/lib/env";

const nextConfig: NextConfig = {
  // The dev badge sits bottom-left, exactly over the rail's expand control.
  devIndicators: false,
  // The browser only ever talks to this origin; the API (and its media URLs)
  // are proxied, so there is no CORS or cross-site cookie to configure.
  experimental: {
    // Self-hosted `next dev` / `next start` proxy rewrites with a 30s default
    // timeout; AI-backed creates and regeneration can take longer on a cold
    // backend. (Vercel ignores this: its edge proxies external rewrites itself.)
    proxyTimeout: 120_000,
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${env.backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
