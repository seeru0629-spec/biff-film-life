"""
BIFF 공식 사이트 "행사안내" 크롤링 — 액터스하우스/마스터클래스/스페셜토크/씨네클래스/스페셜이벤트.
영화 프로그램(prog_view.asp)과 달리 개별 상세페이지가 없는 flat 목록 페이지라, 페이지 하나가
카테고리 하나(=여러 세션을 담은 event 여러 개)에 대응한다. 세션 하나하나는
<div class="...scode-NNN">...<ul class="report">(행사일정/예매코드/행사장소/가격/진행언어)</ul> 블록으로
반복되며, "예매코드"가 idx 대신 세션의 자연키 역할을 한다(div class의 scode-NNN 숫자와 실제
예매코드 값이 다를 수 있어— 예: 10885 페이지의 scode-800인데 예매코드는 831 — 반드시 텍스트로
파싱한 예매코드를 신뢰한다).

한 scode 블록 = event 1건 + session 1건(현재까지 관측상 1:1)으로 다룬다.

사용법:
  python scripts/crawl_biff_events.py --out data/biff_events.json
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path
from typing import Optional

import requests

CATEGORIES = [
    (10877, "액터스 하우스"),
    (10878, "마스터 클래스"),
    (10882, "스페셜 토크"),
    (11043, "씨네 클래스"),
    (10885, "스페셜 이벤트"),
]

PAGE_URL = "https://www.biff.kr/kor/addon/10000001/page.asp?page_num={page_num}"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
YEAR = 2026


def fetch(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    return r.text


def clean(s: str) -> str:
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(re.sub(r"\s+", " ", s)).strip()


def resolve_image(src: str) -> Optional[str]:
    if not src:
        return None
    if src.startswith("http"):
        return src
    if src.startswith("/9611_DATA/"):
        return "https://d2j6u4o1bq9z89.cloudfront.net" + src
    if src.startswith("/"):
        return "https://www.biff.kr" + src
    return src


def parse_schedule_text(text: str):
    """'10월 7일(수) 18:50 - 19:50' 류의 텍스트에서 date/start_time/end_time 추출."""
    m = re.search(r"(\d{1,2})월\s*(\d{1,2})일", text)
    session_date = f"{YEAR}-{int(m.group(1)):02d}-{int(m.group(2)):02d}" if m else None
    times = re.findall(r"(\d{1,2}:\d{2})", text)
    start_time = times[0] if len(times) >= 1 else None
    end_time = times[1] if len(times) >= 2 else None
    return session_date, start_time, end_time


def parse_page(page_html: str, category_name: str, page_num: int):
    events = []
    # scode-NNN 이 붙은 블록 시작 지점마다 분할 (지금까지 관측상 blockquote 성격의 div들)
    splits = list(re.finditer(r'<div[^>]*\bscode-(\d+)[^"]*"[^>]*>', page_html))
    for i, m in enumerate(splits):
        start = m.end()
        end = splits[i + 1].start() if i + 1 < len(splits) else len(page_html)
        block = page_html[start:end]

        tit_m = re.search(r'<div class="tit">(.*?)</div>', block, re.S)
        title = clean(tit_m.group(1)) if tit_m else None
        if not title:
            continue

        cont_m = re.search(r'<div class="cont">(.*?)</div>', block, re.S)
        cont = clean(cont_m.group(1)) if cont_m else None

        report_m = re.search(r'<ul class="report">(.*?)</ul>', block, re.S)
        fields = {}
        if report_m:
            for li_m in re.finditer(r"<em>(.*?)</em>\s*<span>(.*?)</span>", report_m.group(1), re.S):
                fields[clean(li_m.group(1))] = clean(li_m.group(2))

        booking_code = fields.get("예매코드")
        if not booking_code:
            continue  # 예매코드 없는 블록(안내문 등)은 세션이 아니므로 스킵
        session_date, start_time, end_time = parse_schedule_text(fields.get("행사일정", ""))
        if not session_date or not start_time:
            print(f"  [경고] {title} ({booking_code}) 일정 파싱 실패: {fields.get('행사일정')!r}", file=sys.stderr)
            continue

        name_m = re.search(r'class="name">(.*?)</span>', block, re.S)
        host = clean(name_m.group(1)) if name_m else None

        img_m = re.search(r'<img[^>]+src="([^"]+)"', block)
        still_image_url = resolve_image(img_m.group(1)) if img_m else None

        events.append({
            "category": "행사안내",
            "section": category_name,
            "title": title,
            "host": host,
            "synopsis": cont,
            "still_image_url": still_image_url,
            "source_url": f"https://www.biff.kr/kor/addon/10000001/page.asp?page_num={page_num}#scode-{booking_code}",
            "sessions": [{
                "venue_name": fields.get("행사장소"),
                "session_date": session_date,
                "start_time": start_time,
                "end_time": end_time,
                "booking_code": booking_code,
                "source_url": f"https://www.biff.kr/kor/addon/10000001/page.asp?page_num={page_num}#scode-{booking_code}",
            }],
        })
    return events


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/biff_events.json")
    args = ap.parse_args()

    all_events = []
    for page_num, name in CATEGORIES:
        print(f"[크롤링] {name} (page_num={page_num})", file=sys.stderr)
        page_html = fetch(PAGE_URL.format(page_num=page_num))
        events = parse_page(page_html, name, page_num)
        print(f"  -> {len(events)}건 (예매코드: {[e['sessions'][0]['booking_code'] for e in events]})", file=sys.stderr)
        all_events.extend(events)

    # 같은 예매코드가 여러 카테고리 페이지에 중복 노출되는 경우가 있다(예: 831이 스페셜토크/
    # 스페셜이벤트 양쪽에 다 올라오는 건). 예매코드는 세션의 자연키이므로 먼저 나온 것만 남긴다.
    seen_codes = set()
    deduped = []
    for e in all_events:
        code = e["sessions"][0]["booking_code"]
        if code in seen_codes:
            print(f"  [중복 스킵] 예매코드 {code} ({e['section']}: {e['title']})", file=sys.stderr)
            continue
        seen_codes.add(code)
        deduped.append(e)
    all_events = deduped

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(all_events, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"저장 완료: {out_path} (이벤트 {len(all_events)}건)", file=sys.stderr)


if __name__ == "__main__":
    main()
