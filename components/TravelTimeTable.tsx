"use client";

import { Fragment, useMemo, useState } from "react";
import type { Venue, VenueTravelTime } from "@/lib/types";

const SHORT_NAME: Record<string, string> = {
  "영화의전당 하늘연극장": "하늘연",
  CGV센텀시티: "CGV",
  "롯데시네마 센텀시티": "롯데",
  "영화진흥위원회 표준시사실": "영진위",
  "소향씨어터 우리은행홀": "소향",
  "부산시청자미디어센터 공개홀": "미디어센터",
};

// "OO시네마 3관"처럼 번호만 다른 스크린은 같은 건물 안에 있어 이동시간이 사실상 0(같은 층 안
// 걷기)인데도 매트릭스엔 기본값 5분이 깔려 있어 전부 별도 행/열로 나오면 표가 쓸데없이
// 커진다(2026-09-19, 사용자 피드백). "영화의전당"처럼 여러 개별 관 이름이 있는 대형 복합
// 건물은 관 사이 실제 이동시간(5분)이 의미가 있어 그대로 둔다 — 번호 붙은 멀티플렉스
// 스크린("N관"/"IMAX관"/"SM관"/"4DX관")만 건물 단위로 합친다.
function buildingKeyOf(name: string): string {
  return name.replace(/\s+(?:\d+|IMAX|SM|4DX)관$/, "");
}

export function TravelTimeTable({ venues, matrix }: { venues: Venue[]; matrix: VenueTravelTime[] }) {
  const [open, setOpen] = useState(false);

  // 같은 건물의 스크린은 좌표가 동일해 서로 다른 스크린에서 봐도 다른 건물까지의 이동시간이
  // 똑같으므로, 건물당 대표 venue(첫 번째로 나온 것) 하나만 남겨 그걸로 매트릭스를 조회한다.
  const buildings = useMemo(() => {
    const seen = new Map<string, Venue>();
    for (const v of venues) {
      const key = buildingKeyOf(v.name);
      if (!seen.has(key)) seen.set(key, v);
    }
    return Array.from(seen.entries()).map(([name, representative]) => ({ id: representative.id, name }));
  }, [venues]);

  function lookup(fromId: string, toId: string) {
    if (fromId === toId) return "–";
    const hit = matrix.find((t) => t.from_venue_id === fromId && t.to_venue_id === toId);
    return hit ? `${hit.travel_min}분` : "–";
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-3.5 text-left"
      >
        <span className="text-[14px] font-semibold">상영관 이동시간 참고표</span>
        <span className="text-[12px] text-text-faint">{open ? "접기 ⌃" : "펼치기 ⌄"}</span>
      </button>
      {open && (
        <div className="border-t border-hairline px-3.5 pb-3.5 pt-1">
          <div className="overflow-x-auto">
            <div
              className="tabular grid gap-0"
              style={{ gridTemplateColumns: `72px repeat(${buildings.length}, 46px)`, minWidth: 72 + buildings.length * 46 }}
            >
              <div className="py-2.5 text-[10.5px] font-semibold text-text-faint">출발\도착</div>
              {buildings.map((v) => (
                <div key={v.id} className="py-2.5 text-center text-[10.5px] font-semibold text-text-faint">
                  {SHORT_NAME[v.name] ?? v.name}
                </div>
              ))}
              {buildings.map((from) => (
                <Fragment key={from.id}>
                  <div className="truncate border-t border-hairline py-2.5 text-[12px] font-medium">
                    {SHORT_NAME[from.name] ?? from.name}
                  </div>
                  {buildings.map((to) => (
                    <div
                      key={`${from.id}-${to.id}`}
                      className="border-t border-hairline py-2.5 text-center text-[12px] text-icon-faint data-[val]:text-ink"
                    >
                      {lookup(from.id, to.id)}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
