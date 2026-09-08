"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "biffjjam:install-hint-dismissed";

type Platform = "ios" | "samsung" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

const HINT_TEXT: Record<Platform, string> = {
  ios: "하단 공유 버튼(⬆️)을 누르고 '홈 화면에 추가'를 선택하면 앱처럼 편리하게 사용할 수 있어요",
  samsung:
    "하단 메뉴 아이콘(≡)을 누르고 '페이지 추가하기' → '홈 화면'을 선택하면 앱처럼 편리하게 사용할 수 있어요",
  android:
    "우측 상단 메뉴(⋮)에서 '홈 화면에 추가' 또는 '앱 설치'를 선택하면 앱처럼 편리하게 사용할 수 있어요",
  other: "이 사이트를 홈 화면에 추가하면 앱처럼 편리하게 사용할 수 있어요",
};

export function InstallHintBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 기본값(숨김) 유지
    }
  }, []);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 저장 실패해도 이번 세션에서는 닫힌 상태 유지
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-border bg-card px-3.5 py-3">
      <span className="text-[17px]">📲</span>
      <span className="flex-1 text-[12.5px] leading-snug text-text-muted">
        {HINT_TEXT[platform]}
      </span>
      <button
        onClick={dismiss}
        aria-label="닫기"
        className="flex-none text-[13px] text-icon-muted"
      >
        ✕
      </button>
    </div>
  );
}
