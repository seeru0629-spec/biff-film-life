"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        path: window.location.pathname,
        routeType: "render",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-[28px]">⚠️</span>
      <p className="text-[15px] font-medium text-ink">문제가 발생했어요</p>
      <p className="text-[13px] text-text-muted">잠시 후 다시 시도해주세요</p>
      <button
        onClick={() => retry()}
        className="mt-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-surface"
      >
        다시 시도
      </button>
    </div>
  );
}
