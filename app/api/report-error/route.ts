import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/reportError";

/** 클라이언트 전역 에러 핸들러(instrumentation-client.ts)·에러 바운더리(error.tsx)가
 * 보내는 에러를 받아 서버 쪽 reportError로 넘긴다. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await reportError({
      message: typeof body.message === "string" ? body.message : "unknown client error",
      stack: typeof body.stack === "string" ? body.stack : undefined,
      digest: typeof body.digest === "string" ? body.digest : undefined,
      path: typeof body.path === "string" ? body.path : undefined,
      routeType: typeof body.routeType === "string" ? body.routeType : "client",
    });
  } catch {
    // 리포팅 자체의 실패는 조용히 무시
  }
  return NextResponse.json({ ok: true });
}
