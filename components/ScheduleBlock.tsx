"use client";

import { useTransition } from "react";
import { removeFromSchedule } from "@/app/actions";
import { fmtTimeRange } from "@/lib/format";
import type { ScreeningWithDetails } from "@/lib/types";

export function ScheduleBlock({
  token,
  screening,
  style,
}: {
  token: string;
  screening: ScreeningWithDetails;
  style: React.CSSProperties;
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
      style={style}
      className="absolute overflow-hidden rounded-lg border border-biff-red-border border-l-[3px] border-l-biff-red bg-biff-red-bg p-1.75 text-left disabled:opacity-50"
    >
      <div className="tabular mb-1 text-[9.5px] font-semibold text-biff-red-dark">
        {fmtTimeRange(screening.start_time, screening.end_time)}
      </div>
      <div className="truncate text-[11.5px] font-bold leading-snug text-ink-2">{screening.film.title_kor}</div>
      {screening.has_gv && <div className="mt-1 text-[9.5px] text-[#8C6560]">GV 있음</div>}
    </button>
  );
}
