"""
커뮤니티비프(community.biff.kr) 2026년 프로그램 크롤링 — biff.kr 본편과 별도 사이트/구조.
전에는 filmlife_films에 가짜 영화 row로 넣었지만, 영화가 아닌 프로그램이라 이제
filmlife_events/filmlife_event_sessions 전용 구조(events shape)로 출력한다.

- 알려진 서브 프로그램(c_idx 고정값): 리퀘스트시네마(2123) 올데이시네마(2124) 마스터톡(2125)
  블라인드시네마(2126) 커비컬렉션(2127) 취생몽사(2128) 영화만들기 프로젝트(2129)
- 목록 페이지: program_view.asp?c_idx=<c_idx>&QueryYear=2026&QueryType=B&QueryStep=2
  (li.noradio 블록마다 프로그램 묶음 1건. 상영작 여러 편을 한 세션으로 묶어 튼다 — 예:
  span=실제 상영작 제목들("A·B·C·D"), em=세션/기획 타이틀("관객이 키운 영화"))
- 상세 페이지: 위 URL에 m_idx=<m_idx> 추가. 국가/제작연도/러닝타임/장르 + 프로그램소개(시놉시스).
- 날짜별 시간표: schedule_view.asp?QueryStep=1&QueryDate=YYYY-MM-DD (2026-10-08~10-11 확인됨,
  그 앞뒤 날짜는 빈 페이지). 코드/시간/제목(m_idx 링크)/상영관/GV여부가 테이블로 나온다 —
  이 코드가 idx 대신 세션의 자연키(booking_code) 역할을 한다.
  스케줄에서 알려지지 않은 c_idx가 튀어나올 수 있어(예: 2122) 자동 발견해서 처리하되,
  프로그램 목록 페이지에서 마땅한 섹션명을 못 찾으면 "커뮤니티비프 - 기타"로 폴백하고 경고를 남긴다.
- 인코딩: EUC-KR.
- title은 em(세션 타이틀)로 채우고, 실제 상영작 묶음은 synopsis 맨 앞에 "상영작: ..."로 붙인다.
  제작연도/러닝타임이 여러 편分 콤마로 오면 러닝타임은 합산, 제작연도는 최신연도를 사용.

사용법:
  python scripts/crawl_community_biff.py --out data/community_biff_events.json [--limit 5] [--delay 0.4]
"""
import argparse
import html
import re
import sys
import time
import json
from pathlib import Path
from typing import Optional

import requests

BASE = "https://community.biff.kr/kor/addon/00000001/program_view.asp"
SCHEDULE_BASE = "https://community.biff.kr/kor/addon/00000001/schedule_view.asp"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) do-better-workspace film-life crawler"}

KNOWN_SECTIONS = {
    "2123": "리퀘스트시네마",
    "2124": "올데이시네마",
    "2125": "마스터톡",
    "2126": "블라인드시네마",
    "2127": "커비컬렉션",
    "2128": "취생몽사",
    "2129": "영화만들기 프로젝트",
}
SCHEDULE_DATES = ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]


def fetch(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    r.encoding = "euc-kr"
    return r.text


def clean(s: str) -> str:
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(re.sub(r"\s+", " ", s)).strip()


def discover_section_name(c_idx: str) -> str:
    """알려지지 않은 c_idx의 프로그램 목록 페이지에서 섹션명을 유추, 실패하면 폴백."""
    try:
        list_html = fetch(f"{BASE}?c_idx={c_idx}&QueryYear=2026&QueryType=B&QueryStep=2")
    except Exception:
        return "기타"
    m = re.search(r"<h2[^>]*>(.*?)</h2>", list_html, re.S)
    name = clean(m.group(1)) if m else None
    if not name or "라인업" in name or "프로그램" == name:
        print(f"  [경고] c_idx={c_idx} 섹션명을 못 찾아 '기타'로 폴백함 — 수동 확인 필요", file=sys.stderr)
        return "기타"
    return name


def parse_list(page_html: str, c_idx: str, section_name: str):
    items = {}
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
        m_idx = m_idx_m.group(1)
        items[m_idx] = {
            "m_idx": m_idx,
            "c_idx": c_idx,
            "section": f"커뮤니티비프 - {section_name}",
            "title": film_bundle or event_title,
            "event_title": event_title,
            "tags": [clean(t) for t in tags],
            "programmer": clean(dir_m.group(1)) if dir_m else None,
        }
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
    # 실제 사진이 없으면 사이트 자체가 noimg.jpg(플레이스홀더)를 내려준다 — null로 취급해서
    # 앱 쪽에서 우리 아이콘으로 대체 렌더링되게 한다.
    img_src = img_m.group(1) if img_m else None
    out["still_image_url"] = (
        "https://community.biff.kr" + img_src if img_src and "noimg" not in img_src else None
    )

    m = re.search(r'req_contTitle[^>]*>프로그램 소개</em>.*?class="req_contTxt[^"]*">(.*?)</div>', page_html, re.S)
    out["synopsis_detail"] = clean(m.group(1)) if m else None

    return out


def parse_schedule_day(page_html: str, date: str):
    """schedule_view.asp 한 날짜 페이지 -> [{m_idx, c_idx, booking_code, start_time, venue_name, has_gv, session_title}]"""
    sessions = []
    rows = re.findall(r"<tr>(.*?)</tr>", page_html, re.S)
    for row in rows:
        if "m_idx=" not in row:
            continue
        row_clean = re.sub(r"<!--.*?-->", "", row, flags=re.S)
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row_clean, re.S)
        if len(cells) < 7:
            continue
        code_m = re.search(r"txt-point01[^>]*>(\d+)</span>", cells[0])
        time_m = re.search(r"(\d{1,2}:\d{2})", cells[1])
        link_m = re.search(r"c_idx=(\d+)[^']*m_idx=(\d+)['\"][^>]*>(.*?)</a>", cells[2], re.S)
        if not (code_m and time_m and link_m):
            continue
        sessions.append({
            "booking_code": code_m.group(1),
            "start_time": time_m.group(1),
            "c_idx": link_m.group(1),
            "m_idx": link_m.group(2),
            "session_title": clean(link_m.group(3)),
            "venue_name": clean(cells[3]),
            "has_gv": 'data-title="GV"' in cells[6],
            "session_date": date,
        })
    return sessions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/community_biff_events.json")
    ap.add_argument("--limit", type=int, default=None, help="상세 크롤링 개수 제한(테스트용)")
    ap.add_argument("--delay", type=float, default=0.3)
    args = ap.parse_args()

    # 1) 날짜별 시간표 먼저 크롤링 — 실제로 편성된 세션과, 거기 딸린 c_idx 전체를 파악한다.
    all_sessions = []
    for date in SCHEDULE_DATES:
        print(f"[시간표] {date}", file=sys.stderr)
        page_html = fetch(f"{SCHEDULE_BASE}?QueryStep=1&QueryDate={date}")
        day_sessions = parse_schedule_day(page_html, date)
        print(f"  -> {len(day_sessions)}건", file=sys.stderr)
        all_sessions.extend(day_sessions)
        time.sleep(args.delay)

    schedule_cidx = {s["c_idx"] for s in all_sessions}
    section_names = dict(KNOWN_SECTIONS)
    for c_idx in schedule_cidx - set(KNOWN_SECTIONS):
        section_names[c_idx] = discover_section_name(c_idx)
        time.sleep(args.delay)

    # 2) 각 c_idx(알려진 것 + 시간표에서 새로 발견된 것) 목록 페이지 크롤링 -> m_idx별 프로그램 메타
    programs = {}
    for c_idx, name in section_names.items():
        print(f"[목록] {name} (c_idx={c_idx})", file=sys.stderr)
        list_html = fetch(f"{BASE}?c_idx={c_idx}&QueryYear=2026&QueryType=B&QueryStep=2")
        items = parse_list(list_html, c_idx, name)
        print(f"  -> {len(items)}건", file=sys.stderr)
        programs.update(items)

    # 시간표에는 있지만 목록 크롤링으로 못 찾은 m_idx는 세션 텍스트로 최소한의 program 항목을 만든다.
    for s in all_sessions:
        if s["m_idx"] not in programs:
            name = section_names.get(s["c_idx"], "기타")
            programs[s["m_idx"]] = {
                "m_idx": s["m_idx"],
                "c_idx": s["c_idx"],
                "section": f"커뮤니티비프 - {name}",
                "title": s["session_title"],
                "event_title": s["session_title"],
                "tags": [],
                "programmer": None,
            }

    # 3) 상세 페이지 크롤링 (국가/러닝타임/시놉시스 등)
    target_items = list(programs.values())
    if args.limit is not None:
        target_items = target_items[: args.limit]
    print(f"[상세] {len(target_items)}건 크롤링 중...", file=sys.stderr)
    for i, item in enumerate(target_items, 1):
        detail_url = f"{BASE}?m_idx={item['m_idx']}&QueryYear=2026&c_idx={item['c_idx']}&QueryType=B&QueryStep=2"
        try:
            detail_html = fetch(detail_url)
            item.update(parse_detail(detail_html))
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(target_items)}] m_idx={item['m_idx']} 실패: {e}", file=sys.stderr)
        else:
            print(f"  [{i}/{len(target_items)}] {item['title']}", file=sys.stderr)
        time.sleep(args.delay)

    # 4) 세션을 프로그램(m_idx)별로 묶어서 최종 events shape로 조립
    sessions_by_midx = {}
    for s in all_sessions:
        sessions_by_midx.setdefault(s["m_idx"], []).append(s)

    out = []
    for item in target_items:
        tags = ", ".join(item.get("tags") or [])
        parts = []
        if item.get("event_title") and item["event_title"] != item["title"]:
            parts.append(f"[{item['event_title']}]")
        if tags:
            parts.append(f"({tags})")
        if item.get("synopsis_detail"):
            parts.append(item["synopsis_detail"])

        source_url = f"{BASE}?c_idx={item['c_idx']}&QueryYear=2026&QueryType=B&QueryStep=2&m_idx={item['m_idx']}"
        sessions = [{
            "venue_name": s["venue_name"],
            "session_date": s["session_date"],
            "start_time": s["start_time"],
            "end_time": None,
            "booking_code": s["booking_code"],
            "has_gv": s["has_gv"],
            "source_url": source_url,
        } for s in sessions_by_midx.get(item["m_idx"], [])]

        out.append({
            "category": "커뮤니티비프",
            "section": item["section"],
            "title": item["title"],
            "host": item.get("director") or item.get("programmer"),
            "synopsis": " ".join(parts) or None,
            "still_image_url": item.get("still_image_url"),
            "source_url": source_url,
            "sessions": sessions,
        })

    no_session_count = sum(1 for e in out if not e["sessions"])
    if no_session_count:
        print(f"  [참고] 세션(시간표) 없이 메타데이터만 있는 프로그램 {no_session_count}건", file=sys.stderr)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"저장 완료: {out_path} ({len(out)}건, 세션 {sum(len(e['sessions']) for e in out)}건)", file=sys.stderr)


if __name__ == "__main__":
    main()
