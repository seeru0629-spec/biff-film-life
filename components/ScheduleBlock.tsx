"use client";

import { useTransition } from "react";
import { removeFromSchedule, removeEventFromSchedule } from "@/app/actions";
import { fmtTimeRange } from "@/lib/format";
import { LANE_STAGGER } from "@/lib/timetable";
import type { TimetableItem } from "@/lib/types";

export function ScheduleBlock({
  token,
  item,
  top,
  height,
  lane,
}: {
  token: string;
  item: TimetableItem;
  top: number;
  height: number;
  lane: number;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`"${item.title}" ${item.kind === "film" ? "회차" : "일정"}를 시간표에서 뺄까요?`)) return;
    startTransition(() => {
      if (item.kind === "film") removeFromSchedule(token, item.id);
      else removeEventFromSchedule(token, item.id);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      style={{ top, height, left: 4 + lane * LANE_STAGGER, right: 4, zIndex: 10 + lane }}
      className={`absolute overflow-hidden rounded-lg border p-1.75 text-left shadow-sm disabled:opacity-50 ${
        item.kind === "event"
          ? "border-ink-2/30 border-l-[3px] border-l-ink-2 bg-skeleton-2"
          : "border-biff-red-border border-l-[3px] border-l-biff-red bg-biff-red-bg"
      } ${lane > 0 ? "ring-1 ring-white" : ""}`}
    >
      <div className={`tabular mb-1 text-[9.5px] font-semibold ${item.kind === "event" ? "text-ink-2" : "text-biff-red-dark"}`}>
        {fmtTimeRange(item.start_time, item.end_time)}
      </div>
      <div className="truncate text-[11.5px] font-bold leading-snug text-ink-2">{item.title}</div>
      <div className="truncate text-[9.5px] text-[#8C6560]">
        {item.venue_name}
        {item.has_gv ? " · GV" : ""}
      </div>
    </button>
  );
}
