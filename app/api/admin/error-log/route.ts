import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** 스케줄 에이전트(클라우드, 별도 mirror repo에서 실행)가 filmlife_error_log를
 * 읽고 처리 완료 표시를 하는 전용 엔드포인트. service_role 키를 직접 넘기지 않고
 * ERROR_LOG_API_TOKEN 하나로만 인증 — 이 엔드포인트가 할 수 있는 일은
 * 에러 로그 조회/resolved 표시뿐이라 유출돼도 영향 범위가 작다. */
function isAuthorized(req: NextRequest) {
  const token = process.env.ERROR_LOG_API_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("filmlife_error_log")
    .select("id, created_at, message, stack, digest, path, route_type, extra")
    .eq("resolved", false)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ errors: data });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids 필요" }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("filmlife_error_log")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, resolved: ids.length });
}
