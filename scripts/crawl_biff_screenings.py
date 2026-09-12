"""
BIFF 공식 사이트에서 영화별 실제 상영 시간표를 크롤링한다.
각 영화 상세 페이지(prog_view.asp?idx=&c_idx=)에 이미 회차 표가 박혀있어서
(class="pgv_schedule" 안에 pgv_sch_li 반복), 별도 그리드/날짜별 페이지를 긁을 필요 없이
data/biff_films.json의 idx+c_idx 목록만 순회하면 된다.

각 회차(pgv_sch_li)에서:
  - code: 예매 코드(3자리 숫자) — 세션의 자연키, 재시딩 시 remap용
  - date/time: 10-09(금) / 16:20 형식 → 2026-10-09 / 16:20 으로 정규화
  - theater: 상영관 이름(원문 그대로, venue 매칭은 seed 단계에서)
  - GV 아이콘 유무 → has_gv

사용법:
  python scripts/crawl_biff_screenings.py --out data/biff_screenings.json [--limit 10] [--delay 0.3]
"""
import argparse
import html
import json
import re
import sys
import time
from pathlib import Path

import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
DETAIL_URL = "https://www.biff.kr/kor/html/program/prog_view.asp"
YEAR = 2026


def fetch(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    return r.text


def clean(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(re.sub(r"\s+", " ", s)).strip()


def parse_schedule(page_html: str):
    m = re.search(r'<div class="film_sec pgv_sec pgv_schedule">(.*?)<!--', page_html, re.S)
    if not m:
        # 다음 섹션 시작 지점을 못 찾으면(마지막 섹션인 경우 등) 넉넉히 잘라서 재시도
        m = re.search(r'<div class="film_sec pgv_sec pgv_schedule">(.*?)</section>', page_html, re.S)
    if not m:
        return []
    block = m.group(1)

    sessions = []
    for li in re.finditer(r'<div class="pgv_sch_li">(.*?)</div>\s*</div>\s*</div>', block, re.S):
        li_html = li.group(0)
        code_m = re.search(r'class="code[^"]*">.*?</span>(\d+)</span>', li_html, re.S)
        date_m = re.search(r'class="date[^"]*">.*?</span>(\d{1,2})-(\d{1,2})\(', li_html, re.S)
        time_m = re.search(r'class="time[^"]*">.*?</span>(\d{1,2}:\d{2})</span>', li_html, re.S)
        theater_m = re.search(r'class="theater">.*?</span>(.*?)</span>', li_html, re.S)
        if not (code_m and date_m and time_m and theater_m):
            continue
        has_gv = "ico_gv" in li_html
        sessions.append({
            "booking_code": code_m.group(1),
            "screen_date": f"{YEAR}-{int(date_m.group(1)):02d}-{int(date_m.group(2)):02d}",
            "start_time": time_m.group(1),
            "venue_name": clean(theater_m.group(1)),
            "has_gv": has_gv,
        })
    return sessions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--films", default="data/biff_films.json")
    ap.add_argument("--out", default="data/biff_screenings.json")
    ap.add_argument("--limit", type=int, default=None, help="테스트용 — 앞에서 N편만")
    ap.add_argument("--delay", type=float, default=0.3)
    args = ap.parse_args()

    films = json.loads(Path(args.films).read_text(encoding="utf-8"))
    target = films if args.limit is None else films[: args.limit]

    out = []
    total_sessions = 0
    for i, f in enumerate(target, 1):
        url = f"{DETAIL_URL}?idx={f['idx']}&c_idx={f['c_idx']}"
        try:
            page_html = fetch(url)
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(target)}] idx={f['idx']} 요청 실패: {e}", file=sys.stderr)
            time.sleep(args.delay)
            continue
        sessions = parse_schedule(page_html)
        if sessions:
            out.append({
                "film_idx": f["idx"],
                "film_c_idx": f["c_idx"],
                "title_kor": f["title_kor"],
                "sessions": sessions,
            })
            total_sessions += len(sessions)
            print(f"  [{i}/{len(target)}] {f['title_kor']}: {len(sessions)}회차", file=sys.stderr)
        else:
            print(f"  [{i}/{len(target)}] {f['title_kor']}: 회차 없음(미발표)", file=sys.stderr)
        time.sleep(args.delay)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"저장 완료: {out_path} (영화 {len(out)}편, 회차 {total_sessions}건)", file=sys.stderr)


if __name__ == "__main__":
    main()
