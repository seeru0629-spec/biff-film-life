"""
커뮤니티비프(community.biff.kr) 2026년 상영 프로그램 크롤링 — biff.kr 본편과 별도 사이트/구조.
- 6개 서브 프로그램(c_idx 고정값): 리퀘스트시네마(2123) 올데이시네마(2124) 마스터톡(2125)
  블라인드시네마(2126) 커비컬렉션(2127) 취생몽사(2128)
- 목록 페이지: program_view.asp?c_idx=<c_idx>&QueryYear=2026&QueryType=B&QueryStep=2
  (li.noradio 블록마다 상영작 묶음 1건. 상영작 여러 편을 한 세션으로 묶어 튼다 — 예:
  span=실제 상영작 제목들("A·B·C·D"), em=세션/기획 타이틀("관객이 키운 영화"))
- 상세 페이지: 위 URL에 m_idx=<m_idx> 추가. 국가/제작연도/러닝타임/장르 + 프로그램소개(시놉시스).
- 인코딩: EUC-KR.
- title_kor은 em(세션 타이틀)로 채우고, 실제 상영작 묶음은 synopsis 맨 앞에 "상영작: ..."로 붙인다.
  제작연도/러닝타임이 여러 편分 콤마로 오면 러닝타임은 합산, 제작연도는 최신연도를 사용.

사용법:
  python scripts/crawl_community_biff.py --out data/community_biff_films.json [--limit 5] [--delay 0.4]
"""
import argparse
import html
import json
import re
import sys
import time
from pathlib import Path

import requests

BASE = "https://community.biff.kr/kor/addon/00000001/program_view.asp"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) do-better-workspace film-life crawler"}

SECTIONS = [
    ("2123", "리퀘스트시네마"),
    ("2124", "올데이시네마"),
    ("2125", "마스터톡"),
    ("2126", "블라인드시네마"),
    ("2127", "커비컬렉션"),
    ("2128", "취생몽사"),
]


def fetch(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    r.encoding = "euc-kr"
    return r.text


def clean(s: str) -> str:
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(re.sub(r"\s+", " ", s)).strip()


def parse_list(page_html: str, c_idx: str, section_name: str):
    items = []
    chunks = page_html.split('<li class="noradio">')[1:]
    blocks = []
    for chunk in chunks:
        m = re.search(r".*?</li>", chunk, re.S)
        if m:
            blocks.append(m.group(0))
    for b in blocks:
        m_idx_m = re.search(r"m_idx=(\d+)", b)
        title_m = re.search(r'class="db caaaaaa[^"]*"[^>]*>(.*?)</span>', b, re.S)
        session_m = re.search(r'class="db mb2rem[^"]*"[^>]*>(.*?)</em>', b, re.S)
        keyword_m = re.search(r'class="keyword">(.*?)</div>', b, re.S)
        dir_m = re.search(r'class="dir hide">\s*(.*?)\s*</p>', b, re.S)
        if not m_idx_m or not session_m:
            continue
        tags = re.findall(r"<span>(.*?)</span>", keyword_m.group(1)) if keyword_m else []
        film_bundle = clean(title_m.group(1)) if title_m else None
        event_title = clean(session_m.group(1))
        items.append({
            "m_idx": m_idx_m.group(1),
            "c_idx": c_idx,
            "section": f"커뮤니티비프 - {section_name}",
            "title_kor": film_bundle or event_title,
            "event_title": event_title,
            "tags": [clean(t) for t in tags],
            "programmer": clean(dir_m.group(1)) if dir_m else None,
        })
    return items


def parse_detail(page_html: str) -> dict:
    out = {}

    m = re.search(r"<i>Director</i>.*?<span>(.*?)</span>", page_html, re.S)
    out["director"] = clean(m.group(1)) if m else None

    m = re.search(r"<dt>국가</dt>\s*<dd>(.*?)</dd>", page_html, re.S)
    out["country"] = clean(m.group(1)) if m else None

    m = re.search(r"<dt>제작연도</dt>\s*<dd>(.*?)</dd>", page_html, re.S)
    if m:
        years = [int(y) for y in re.findall(r"\d{4}", m.group(1))]
        out["release_year"] = max(years) if years else None
    else:
        out["release_year"] = None

    m = re.search(r"<dt>러닝타임</dt>\s*<dd>(.*?)</dd>", page_html, re.S)
    if m:
        mins = [int(x) for x in re.findall(r"\d+", m.group(1))]
        out["runtime_min"] = sum(mins) if mins else None
    else:
        out["runtime_min"] = None

    img_m = re.search(r'swiper-wrapper">\s*<div class="swiper-slide">\s*<img src="([^"]+)"', page_html, re.S)
    out["still_image_url"] = ("https://community.biff.kr" + img_m.group(1)) if img_m else None

    m = re.search(r'req_contTitle[^>]*>프로그램 소개</em>.*?class="req_contTxt[^"]*">(.*?)</div>', page_html, re.S)
    out["synopsis_detail"] = clean(m.group(1)) if m else None

    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/community_biff_films.json")
    ap.add_argument("--limit", type=int, default=None, help="섹션당 상세 크롤링 개수 제한(테스트용)")
    ap.add_argument("--delay", type=float, default=0.3)
    args = ap.parse_args()

    all_items = []
    for c_idx, name in SECTIONS:
        url = f"{BASE}?c_idx={c_idx}&QueryYear=2026&QueryType=B&QueryStep=2"
        print(f"[목록] {name} (c_idx={c_idx})", file=sys.stderr)
        list_html = fetch(url)
        items = parse_list(list_html, c_idx, name)
        print(f"  -> {len(items)}건", file=sys.stderr)
        all_items.extend(items)

    target = all_items if args.limit is None else all_items[: args.limit]
    print(f"[상세] {len(target)}건 크롤링 중...", file=sys.stderr)
    for i, item in enumerate(target, 1):
        detail_url = f"{BASE}?m_idx={item['m_idx']}&QueryYear=2026&c_idx={item['c_idx']}&QueryType=B&QueryStep=2"
        try:
            detail_html = fetch(detail_url)
            item.update(parse_detail(detail_html))
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(target)}] m_idx={item['m_idx']} 실패: {e}", file=sys.stderr)
        else:
            print(f"  [{i}/{len(target)}] {item['title_kor']}", file=sys.stderr)
        time.sleep(args.delay)

    out = []
    for item in target:
        tags = ", ".join(item.get("tags") or [])
        parts = []
        if item.get("event_title") and item["event_title"] != item["title_kor"]:
            parts.append(f"[{item['event_title']}]")
        if tags:
            parts.append(f"({tags})")
        if item.get("synopsis_detail"):
            parts.append(item["synopsis_detail"])
        out.append({
            "idx": item["m_idx"],
            "c_idx": item["c_idx"],
            "section": item["section"],
            "title_kor": item["title_kor"],
            "title_eng": None,
            "director": item.get("director") or item.get("programmer"),
            "country": item.get("country"),
            "synopsis": " ".join(parts) or None,
            "runtime_min": item.get("runtime_min"),
            "release_year": item.get("release_year"),
            "still_image_url": item.get("still_image_url"),
            "wp_status": None,
        })

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"저장 완료: {out_path} ({len(out)}건)", file=sys.stderr)


if __name__ == "__main__":
    main()
