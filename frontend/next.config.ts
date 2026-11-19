import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
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
