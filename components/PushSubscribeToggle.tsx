"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** 게시판 댓글 알림 구독 토글. viewer_token 하나당 한 번만 켜두면 이후 내 글/댓글에 달리는
 * 모든 댓글 알림에 적용된다(글마다 따로 켤 필요 없음) — lib/push.ts의 notifyNewComment 참고. */
export function PushSubscribeToggle({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "subscribed" : "unsubscribed");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        // 서버에 저장 못 했으면 브라우저 구독만 남아 헷갈리니 바로 정리한다.
        await sub.unsubscribe();
        setStatus("unsubscribed");
        return;
      }
      setStatus("subscribed");
    } catch {
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  if (status === "denied") {
    return (
      <div className="mb-3.5 rounded-[11px] bg-skeleton-2 px-3.5 py-2.5 text-[11.5px] text-text-faint">
        알림이 기기 설정에서 차단돼 있어요. 브라우저 알림 권한을 허용하면 켤 수 있어요
      </div>
    );
  }

  return (
    <button
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      disabled={busy}
      className={`mb-3.5 flex w-full items-center justify-between rounded-[11px] px-3.5 py-2.5 text-[12.5px] font-medium disabled:opacity-60 ${
        status === "subscribed" ? "bg-ink-2 text-white" : "bg-skeleton-2 text-text-muted"
      }`}
    >
      <span>내 글·댓글에 답 달리면 알림 받기</span>
      <span className="font-semibold">{status === "subscribed" ? "켜짐 ✓" : "켜기"}</span>
    </button>
  );
}
