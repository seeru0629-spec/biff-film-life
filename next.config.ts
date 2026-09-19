import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d2j6u4o1bq9z89.cloudfront.net" },
      { protocol: "https", hostname: "community.biff.kr" },
      { protocol: "https", hostname: "www.biff.kr" },
    ],
    // Vercel Hobby 플랜의 월간 Image Optimization 소스 이미지 할당량을 다 써서 /_next/image가
    // 전부 402(OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)를 내기 시작함(2026-09-19 확인, 로컬
    // 정적 아이콘까지 포함해 전체 최적화 이미지가 깨짐). BIFF 원본 이미지는 이미 적당한 크기의
    // thumb 버전이라 최적화 없이 원본을 그대로 내려줘도 손해가 크지 않으므로 최적화를 끄고
    // 브라우저가 원본 URL을 직접 가져오게 한다.
    unoptimized: true,
  },
};

export default nextConfig;
