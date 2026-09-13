function reportClientError(message: string, stack?: string, routeType = "client") {
  try {
    fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, stack, path: window.location.pathname, routeType }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 리포팅 실패가 앱 동작에 영향을 주면 안 됨
  }
}

window.addEventListener("error", (event) => {
  reportClientError(event.error?.message ?? event.message, event.error?.stack);
});

function describeRejectionReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (typeof Event !== "undefined" && reason instanceof Event) {
    const target = reason.target as { tagName?: string; src?: string; currentSrc?: string } | null;
    const targetInfo = target?.currentSrc ?? target?.src ?? target?.tagName;
    return `${reason.type} event${targetInfo ? ` on ${targetInfo}` : ""}`;
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  reportClientError(
    describeRejectionReason(reason),
    reason instanceof Error ? reason.stack : undefined,
    "client-unhandled-rejection"
  );
});
