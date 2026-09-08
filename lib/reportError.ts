import { supabaseAdmin } from "./supabase";

type ReportErrorInput = {
  message: string;
  stack?: string;
  digest?: string;
  path?: string;
  routeType?: string;
  extra?: Record<string, unknown>;
};

/** 서버(onRequestError)·클라이언트(전역 에러 핸들러) 양쪽에서 호출되는 단일 수집 지점.
 * 이 함수 자체가 던지면 안 되므로 각 단계를 개별 try/catch로 감싼다. */
export async function reportError(input: ReportErrorInput) {
  const { message, stack, digest, path, routeType, extra } = input;

  try {
    await supabaseAdmin()
      .from("filmlife_error_log")
      .insert({ message, stack, digest, path, route_type: routeType, extra });
  } catch (e) {
    console.error("[reportError] supabase insert failed", e);
  }

  const webhookUrl = process.env.ERROR_ALERT_SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const lines = [
      `🚨 부국쨈 에러${path ? ` — ${path}` : ""}`,
      `\`${message}\``,
      digest ? `digest: ${digest}` : null,
      routeType ? `route: ${routeType}` : null,
    ].filter((line): line is string => line !== null);

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  } catch (e) {
    console.error("[reportError] slack notify failed", e);
  }
}
