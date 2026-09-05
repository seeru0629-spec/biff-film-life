"""
BIFF(부산국제영화제) 공식 사이트에서 2026년 상영작 목록 + 상세정보를 크롤링.
- 목록 페이지: prog_all_list.asp?allYear=2026 (섹션별 표, 실제 idx/c_idx 포함)
- 상세 페이지: prog_view.asp?idx=<idx>&c_idx=<c_idx> (시놉시스/러닝타임/제작연도/스틸컷)

시간표(상영관/일시)는 9/11 발표 전이라 이 스크립트로는 가져오지 않는다 — films 테이블만 채운다.
재실행 시 idx 기준으로 갱신(중복 방지)되도록 films.source_url(=idx 포함)을 유니크 키처럼 사용.

사용법:
  python scripts/crawl_biff_films.py --out data/biff_films.json [--limit 20] [--delay 0.4]
"""
import argparse
import html
import json
import re
import time
import sys
from pathlib import Path

import requests

LIST_URL = "https://www.biff.kr/kor/html/program/prog_all_list.asp?allYear=2026"
DETAIL_URL = "https://www.biff.kr/kor/html/program/prog_view.asp?idx={idx}&c_idx={c_idx}"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) do-better-workspace film-life crawler"}


def fetch(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    r.encoding = "utf-8"
    return r.text


def parse_list(html: str):
    sections = re.split(r'<div class="list_sec">', html)[1:]
    films = []
    for sec in sections:
        h3m = re.search(r"<strong>\s*(.*?)\s*</strong>", sec, re.S)
        section_name = re.sub(r"\s+", " ", h3m.group(1)).strip() if h3m else None
        rows = re.findall(r'<tr class="href_view".*?</tr>', sec, re.S)
        for row in rows:
            idxm = re.search(r"idx=(\d+)&c_idx=(\d+)", row)
            titlem = re.search(r"<b onclick=.*?>(.*?)</b>", row, re.S)
            dirm = re.search(r'class="director"[^>]*>(.*?)</td>', row, re.S)
            ctrym = re.search(r'class="country"[^>]*>(.*?)</td>', row, re.S)
            if not idxm or not titlem:
                continue
            title_raw = html.unescape(re.sub(r"\s+", " ", titlem.group(1)).strip())
            title_kor, _, title_eng = title_raw.partition(" / ")
            dir_raw = html.unescape(re.sub(r"\s+", " ", dirm.group(1)).strip()) if dirm else ""
            director_kor, _, director_eng = dir_raw.partition(" / ")
            films.append({
                "idx": idxm.group(1),
                "c_idx": idxm.group(2),
                "section": section_name,
                "title_kor": title_kor.strip(),
                "title_eng": title_eng.strip() or None,
                "director": (director_kor or director_eng or "").strip() or None,
                "country": html.unescape(re.sub(r"\s+", " ", ctrym.group(1)).strip()) if ctrym else None,
            })
    return films


def parse_detail(page_html: str) -> dict:
    out = {}
    m = re.search(r'class="filmtop_visual" style="background-image: url\(\'(.*?)\'\)', page_html)
    if not m:
        m = re.search(r'id="color-img" src="(.*?)"', page_html)
    out["still_image_url"] = m.group(1) if m else None

    m = re.search(r"제작연도</span>(\d{4})", page_html)
    out["release_year"] = int(m.group(1)) if m else None

    m = re.search(r"러닝타임</span>(\d+)\s*min", page_html)
    out["runtime_min"] = int(m.group(1)) if m else None

    m = re.search(r'class="film_sec film_synopsis">.*?class="desc">(.*?)</div>', page_html, re.S)
    if m:
        synopsis = re.sub(r"<[^>]+>", " ", m.group(1))
        synopsis = html.unescape(re.sub(r"\s+", " ", synopsis).strip())
        out["synopsis"] = synopsis or None
    else:
        out["synopsis"] = None

    # "World Premiere" 문자열이 매 페이지 <!-- World Premiere 뱃지 --> 주석으로 항상 존재해
    # 페이지 전체 검색은 오탐(전 편 WP로 표기)을 일으킴 — 실제 뱃지 span으로 범위를 좁힘.
    m = re.search(r'class="pg_section"><span class="sectionName">(.*?)</span>', page_html)
    badge = html.unescape(m.group(1)).strip() if m else ""
    out["wp_status"] = "WP" if re.search(r"\bWorld Premiere\b|월드\s*프리미어", badge) else None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/biff_films.json")
    ap.add_argument("--limit", type=int, default=None, help="상세 크롤링할 영화 수 제한(테스트용)")
    ap.add_argument("--delay", type=float, default=0.4)
    ap.add_argument("--list-only", action="store_true", help="목록만 저장하고 상세는 건너뜀")
    args = ap.parse_args()

    print(f"[1/2] 목록 페이지 가져오는 중: {LIST_URL}", file=sys.stderr)
    list_html = fetch(LIST_URL)
    films = parse_list(list_html)
    print(f"  -> {len(films)}편 파싱됨", file=sys.stderr)

    if not args.list_only:
        target = films if args.limit is None else films[: args.limit]
        print(f"[2/2] 상세 페이지 {len(target)}건 크롤링 중...", file=sys.stderr)
        for i, film in enumerate(target, 1):
            url = DETAIL_URL.format(idx=film["idx"], c_idx=film["c_idx"])
            try:
                detail_html = fetch(url)
                film.update(parse_detail(detail_html))
            except Exception as e:  # noqa: BLE001
                print(f"  [{i}/{len(target)}] idx={film['idx']} 실패: {e}", file=sys.stderr)
            else:
                print(f"  [{i}/{len(target)}] {film['title_kor']}", file=sys.stderr)
            time.sleep(args.delay)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(films, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"저장 완료: {out_path} ({len(films)}편)", file=sys.stderr)


if __name__ == "__main__":
    main()
