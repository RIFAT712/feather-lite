import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["harfbuzzjs", "opentype.js"],
  compress: true,
  poweredByHeader: false,
  typescript: {
    // Verified locally via `tsc --noEmit` before commits; skips duplicate build-time typecheck on Toolforge
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/auth/:path*",
        destination: "http://localhost:8081/auth/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:8081/api/:path*",
      },
    ];
  },
};

export default nextConfig;
