import type { NextConfig } from "next";

const config: NextConfig = {
  // Same-origin browser requests keep the scientific service private to loopback.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites
  async rewrites() {
    const backend = process.env.LUNAROS_BACKEND_URL ?? "http://127.0.0.1:8000";
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
  devIndicators: false,
};

export default config;
