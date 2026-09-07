"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "biffjjam:install-hint-dismissed";

export function InstallHintBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
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
        이 사이트를 홈 화면에 추가하면 앱처럼 편리하게 사용할 수 있어요
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
