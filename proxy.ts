import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateViewerToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase";

// 개인 링크(/s/[token])를 쿠키로 기억해뒀다가, "/"(예: 홈 화면 추가 아이콘의 고정 시작 주소)로
// 들어오면 새 토큰을 발급하는 대신 원래 링크로 돌려보낸다. 그래야 홈 화면 아이콘으로 열어도
// 그동안 담은 시간표가 안 보이는(=새 빈 링크로 튕기는) 일이 없다.
const COOKIE_NAME = "flt";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // 400일 — Chrome이 허용하는 최대치

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const existing = request.cookies.get(COOKIE_NAME)?.value;
    if (existing) {
      return NextResponse.redirect(new URL(`/s/${existing}`, request.url));
    }

    const token = generateViewerToken();
    const { error } = await supabaseAdmin().from("filmlife_viewers").insert({ token });
    if (error) {
      // 실패하면 app/page.tsx의 기존 로직(매번 새 토큰 발급)으로 폴백
      return NextResponse.next();
    }
    const response = NextResponse.redirect(new URL(`/s/${token}`, request.url));
    response.cookies.set(COOKIE_NAME, token, { maxAge: COOKIE_MAX_AGE, path: "/", sameSite: "lax" });
    return response;
  }

  const match = pathname.match(/^\/s\/([^/]+)/);
  if (match) {
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, match[1], { maxAge: COOKIE_MAX_AGE, path: "/", sameSite: "lax" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/s/:path*"],
};
