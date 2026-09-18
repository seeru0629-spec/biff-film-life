import { supabaseAdmin } from "./supabase";

type ReportErrorInput = {
  message: string;
  stack?: string;
  digest?: string;
  path?: string;
  routeType?: string;
  extra?: Record<string, unknown>;
};

const NOISE_SPIKE_WINDOW_MS = 60 * 60 * 1000; // 최근 1시간
const NOISE_SPIKE_THRESHOLD = 10; // 이 창 안에서 같은 잡음 메시지가 이 건수에 "도달하는 순간"만 알림 — 홍보 직후 유입 급증으로 인한 오탐 방지 위해 상향(2026-09-18)

/**
 * 우리 코드로는 절대 고칠 수 없다고 이미 확인된 잡음만 여기 등록한다(화이트리스트).
 * 목록에 없는 메시지는 전부 기본적으로 "실체 있을 수 있는 에러"로 취급해 즉시 알림 —
 * 새 패턴을 임의로 잡음 취급해 조용히 묻는 사고를 막기 위한 의도적 설계.
 *
 * - "Script error." + stack 없음: 크로스오리진 스크립트 에러라 브라우저가 세부정보를
 *   지운 것. 우리 코드가 원인인지조차 알 수 없어 고칠 대상이 없다.
 * - stack에 iabjs:// 포함: 카카오톡 등 인앱브라우저가 자체 주입하는 브릿지 스크립트
 *   에러(2026-09-12 확인, 우리 앱 코드와 무관).
 *
 * 두 경우 다 "message는 같은데 stack이 새로 붙는" 식으로 정보가 더 생기면 이 함수가
 * 더 이상 매치하지 않으므로 자동으로 일반 알림 경로로 넘어간다 — 별도 로직 없이도
 * "패턴이 바뀌면 알림"이 성립한다.
 */
function isKnownUnfixableNoise({ routeType, message, stack }: ReportErrorInput): boolean {
  if (routeType !== "client") return false;
  if (message === "Script error." && !stack) return true;
  if (stack?.includes("iabjs://")) return true;
  return false;
}

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

  let alertText: string | null = null;

  if (isKnownUnfixableNoise(input)) {
    // 개별 건은 알리지 않되, 같은 잡음이 짧은 시간에 몰리면(급증) 그때만 확인 요청한다.
    try {
      const since = new Date(Date.now() - NOISE_SPIKE_WINDOW_MS).toISOString();
      const { count, error } = await supabaseAdmin()
        .from("filmlife_error_log")
        .select("id", { count: "exact", head: true })
        .eq("message", message)
        .eq("route_type", routeType)
        .gte("created_at", since);

      if (error) throw error;

      if (count === NOISE_SPIKE_THRESHOLD) {
        alertText = [
          `⚠️ 부국쨈 잡음성 에러 급증 (최근 1시간 ${count}건)`,
          `\`${message}\``,
          path ? `path: ${path}` : null,
          `route: ${routeType}`,
          "※ 평소엔 원인 파악 불가한 잡음으로 분류돼 알림을 안 보내는 메시지인데, 빈도가 갑자기 늘어 확인이 필요합니다.",
        ]
          .filter((line): line is string => line !== null)
          .join("\n");
      }
    } catch (e) {
      console.error("[reportError] noise spike check failed", e);
    }
  } else {
    alertText = [
      `🚨 부국쨈 에러${path ? ` — ${path}` : ""}`,
      `\`${message}\``,
      digest ? `digest: ${digest}` : null,
      routeType ? `route: ${routeType}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
  }

  if (!alertText) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: alertText }),
    });
  } catch (e) {
    console.error("[reportError] slack notify failed", e);
  }
}
