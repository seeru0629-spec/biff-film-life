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

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  reportClientError(
    reason instanceof Error ? reason.message : String(reason),
    reason instanceof Error ? reason.stack : undefined,
    "client-unhandled-rejection"
  );
});
