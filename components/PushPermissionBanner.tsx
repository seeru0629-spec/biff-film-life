"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Env = "unsupported" | "ios-needs-install" | "ready" | "granted";

export function PushPermissionBanner({ token }: { token: string }) {
  const [env, setEnv] = useState<Env>("ready");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEnv("unsupported");
    } else if (isIOS && !isStandalone) {
      setEnv("ios-needs-install");
    } else if (Notification.permission === "granted") {
      setEnv("granted");
    } else {
      setEnv("ready");
    }
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, subscription }),
      });
      setEnv("granted");
    } finally {
      setBusy(false);
    }
  }

  if (env === "granted" || env === "unsupported") return null;

  return (
    <div className="mb-5 rounded-[14px] bg-ink-2 p-4 text-white">
      <div className="mb-3 flex items-start gap-2.5">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none">
          <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
          <path d="M10.5 20a2 2 0 0 0 3 0" />
        </svg>
        <div className="flex-1">
          <div className="mb-1.5 text-[13.5px] font-bold">알림을 받으려면 권한이 필요해요</div>
          {env === "ios-needs-install" ? (
            <div className="text-[12px] leading-relaxed text-white/68">
              아이폰은 Safari 공유 → <b className="font-semibold text-festival-yellow">홈 화면에 추가</b> 후 이 앱을 열어야
              알림이 옵니다. (iOS 16.4 이상)
            </div>
          ) : (
            <div className="text-[12px] leading-relaxed text-white/68">
              취소표가 발생하면 바로 알려드릴게요. 브라우저 알림 권한을 허용해주세요.
            </div>
          )}
        </div>
      </div>
      {env === "ready" && (
        <button
          onClick={subscribe}
          disabled={busy}
          className="w-full rounded-[10px] bg-biff-red py-3 text-center text-[13.5px] font-bold disabled:opacity-60"
        >
          {busy ? "처리 중…" : "알림 권한 허용하기"}
        </button>
      )}
    </div>
  );
}
