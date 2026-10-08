import type { NextConfig } from "next";

import { env } from "./src/lib/env";

const nextConfig: NextConfig = {
  // The dev badge sits bottom-left, exactly over the rail's expand control.
  devIndicators: false,
  // The browser only ever talks to this origin; the API (and its media URLs)
  // are proxied, so there is no CORS or cross-site cookie to configure.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${env.backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
