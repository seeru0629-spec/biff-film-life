"use client";

import { useTransition } from "react";
import { removeFromSchedule } from "@/app/actions";
import { fmtTimeRange } from "@/lib/format";
import { LANE_STAGGER } from "@/lib/timetable";
import type { ScreeningWithDetails } from "@/lib/types";

export function ScheduleBlock({
  token,
  screening,
  top,
  height,
  lane,
}: {
  token: string;
  screening: ScreeningWithDetails;
  top: number;
  height: number;
  lane: number;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`"${screening.film.title_kor}" 회차를 시간표에서 뺄까요?`)) return;
    startTransition(() => {
      removeFromSchedule(token, screening.id);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      style={{ top, height, left: 4 + lane * LANE_STAGGER, right: 4, zIndex: 10 + lane }}
      className={`absolute overflow-hidden rounded-lg border border-biff-red-border border-l-[3px] border-l-biff-red bg-biff-red-bg p-1.75 text-left shadow-sm disabled:opacity-50 ${
        lane > 0 ? "ring-1 ring-white" : ""
      }`}
    >
      <div className="tabular mb-1 text-[9.5px] font-semibold text-biff-red-dark">
        {fmtTimeRange(screening.start_time, screening.end_time)}
      </div>
      <div className="truncate text-[11.5px] font-bold leading-snug text-ink-2">{screening.film.title_kor}</div>
      <div className="truncate text-[9.5px] text-[#8C6560]">
        {screening.venue.name}
        {screening.has_gv ? " · GV" : ""}
      </div>
    </button>
  );
}
