import { NextResponse } from "next/server";

// 이미지로 저장(html-to-image) 캡처 시 CloudFront 스틸컷이 CORS 헤더를 안 줘서
// canvas가 tainted 되는 문제를 막기 위한 동일 출처 프록시. BIFF CDN 이미지만 허용.
const ALLOWED_HOSTS = new Set(["d2j6u4o1bq9z89.cloudfront.net", "community.biff.kr"]);

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("url");
  if (!target) return NextResponse.json({ error: "url 필요" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "잘못된 url" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "허용되지 않은 호스트" }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "이미지를 가져오지 못함" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
