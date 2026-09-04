"use client";

import { useState } from "react";

export function ShareAppButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const shareData = {
      title: "부국쨈 [BIFF-JJAM]",
      text: "부산국제영화제 친구들을 위한 나만의 축제 메이트, 부국쨈",
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 사용자가 공유를 취소한 경우 등 — 무시
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 클립보드 접근 실패 — 조용히 무시
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="친구에게 공유하기"
      className="relative flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-white"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7z" />
      </svg>
      {copied && (
        <span className="absolute -bottom-8 right-0 whitespace-nowrap rounded-md bg-ink-2 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg">
          링크 복사됨
        </span>
      )}
    </button>
  );
}
