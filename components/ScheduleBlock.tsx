"use client";

import { useTransition } from "react";
import { removeFromSchedule, removeEventFromSchedule } from "@/app/actions";
import { fmtTimeRange } from "@/lib/format";
import { LANE_STAGGER } from "@/lib/timetable";
import type { TimetableItem } from "@/lib/types";
import { useScheduleSelection } from "./ScheduleSelection";

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
  const { selecting, selected, toggle } = useScheduleSelection();
  const isSelected = selected.has(item.id);

  function handleClick() {
    if (selecting) {
      toggle(item.id);
      return;
    }
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
      } ${isSelected ? "ring-2 ring-biff-red" : lane > 0 ? "ring-1 ring-white" : ""}`}
    >
      {selecting && (
        <span
          className={`absolute right-1 top-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
            isSelected ? "border-biff-red bg-biff-red text-white" : "border-border-2 bg-white"
          }`}
        >
          {isSelected && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
      )}
      <div className="mb-1 flex items-center gap-1">
        <span className={`tabular text-[9.5px] font-semibold ${item.kind === "event" ? "text-ink-2" : "text-biff-red-dark"}`}>
          {fmtTimeRange(item.start_time, item.end_time)}
        </span>
        {item.booking_code && (
          <span
            className={`tabular flex-none rounded-full px-1.25 py-0.25 text-[8px] font-bold leading-tight text-white ${
              item.kind === "event" ? "bg-ink-2" : "bg-biff-red"
            }`}
          >
            {item.booking_code}
          </span>
        )}
      </div>
      <div className="truncate text-[11.5px] font-bold leading-snug text-ink-2">{item.title}</div>
      <div className="truncate text-[9.5px] text-[#8C6560]">
        {item.venue_name}
        {item.has_gv ? " · GV" : ""}
      </div>
    </button>
  );
}
