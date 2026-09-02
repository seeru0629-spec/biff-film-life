"use client";

import { Fragment, useState } from "react";
import type { Venue, VenueTravelTime } from "@/lib/types";

const SHORT_NAME: Record<string, string> = {
  "영화의전당 하늘연": "하늘연",
  "CGV 센텀시티": "CGV",
  "롯데시네마 센텀시티": "롯데",
  "영진위 표준시사실": "영진위",
  소향씨어터: "소향",
  부산시청자미디어센터: "미디어센터",
};

export function TravelTimeTable({ venues, matrix }: { venues: Venue[]; matrix: VenueTravelTime[] }) {
  const [open, setOpen] = useState(false);

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
              style={{ gridTemplateColumns: `72px repeat(${venues.length}, 46px)`, minWidth: 72 + venues.length * 46 }}
            >
              <div className="py-2.5 text-[10.5px] font-semibold text-text-faint">출발\도착</div>
              {venues.map((v) => (
                <div key={v.id} className="py-2.5 text-center text-[10.5px] font-semibold text-text-faint">
                  {SHORT_NAME[v.name] ?? v.name}
                </div>
              ))}
              {venues.map((from) => (
                <Fragment key={from.id}>
                  <div className="truncate border-t border-hairline py-2.5 text-[12px] font-medium">
                    {SHORT_NAME[from.name] ?? from.name}
                  </div>
                  {venues.map((to) => (
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
