import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "부국쨈 [BIFF-JJAM]",
    short_name: "부국쨈",
    description: "BIFF 개인 시간표 · 맛집 · 소식",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#1b1815",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
