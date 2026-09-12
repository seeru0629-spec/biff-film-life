import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d2j6u4o1bq9z89.cloudfront.net" },
      { protocol: "https", hostname: "community.biff.kr" },
      { protocol: "https", hostname: "www.biff.kr" },
    ],
  },
};

export default nextConfig;
