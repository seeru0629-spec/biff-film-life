import type { TimetableItem, VenueTravelTime } from "./types";
import { findTravelWarnings } from "./travel";

export const ROW_HEIGHT = 64; // px per hour
const LANE_STAGGER = 12; // px : 겹치는 항목이 있을 때 뒤 블록을 앞 블록 오른쪽으로 살짝 밀어 겹쳐 쌓는다

function toMinutes(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
}

/** 자정을 넘겨 끝나는 회차(예: 22:30~00:05)는 end가 start보다 작게 나와 음수 길이가 되던 버그(2026-09-19)를 막는다.
 * 그리드는 당일 24:00까지만 그리므로(hourEnd가 24로 캡됨) 자정 이후분은 24:00에서 잘라 표시한다. */
function toEndMinutes(startMin: number, endHms: string) {
  const raw = toMinutes(endHms);
  return raw < startMin ? 24 * 60 : raw;
}

export type DayColumn = {
  date: string;
  blocks: {
    item: TimetableItem;
    top: number;
    height: number;
    lane: number; // 0 = 겹침 없음/첫 블록, 1+ = 겹쳐서 뒤로 밀린 순번
  }[];
  warnings: { top: number; gapMin: number }[];
};

export type MultiDayLayout = {
  hourStart: number;
  hourEnd: number;
  hours: number[];
  columns: DayColumn[];
};

/** 겹치는 항목은 같은 열 안에서 뒤 블록을 살짝 오른쪽으로 밀어 쌓는다 (레인 분리 없이). */
function assignLanes(sorted: TimetableItem[], starts: number[], ends: number[]) {
  const laneEnds: number[] = [];
  return sorted.map((_, i) => {
    let lane = laneEnds.findIndex((end) => starts[i] >= end);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = ends[i];
    return lane;
  });
}

export function buildMultiDayLayout(
  dates: string[],
  itemsByDate: Map<string, TimetableItem[]>,
  travelMatrix: VenueTravelTime[]
): MultiDayLayout {
  const allItems = dates.flatMap((d) => itemsByDate.get(d) ?? []);
  const allStarts = allItems.map((s) => toMinutes(s.start_time));
  const allEnds = allItems.map((s, i) =>
    s.end_time ? toEndMinutes(allStarts[i], s.end_time) : allStarts[i] + (s.runtime_min ?? 90)
  );
  const hourStart = Math.max(0, Math.floor(Math.min(...allStarts, 9 * 60) / 60));
  const hourEnd = Math.min(24, Math.ceil(Math.max(...allEnds, 18 * 60) / 60));
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i);

  const columns = dates.map((date): DayColumn => {
    const sorted = [...(itemsByDate.get(date) ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const starts = sorted.map((s) => toMinutes(s.start_time));
    const ends = sorted.map((s, i) =>
      s.end_time ? toEndMinutes(starts[i], s.end_time) : starts[i] + (s.runtime_min ?? 90)
    );
    const lanes = assignLanes(sorted, starts, ends);

    const blocks = sorted.map((s, i) => ({
      item: s,
      top: ((starts[i] - hourStart * 60) / 60) * ROW_HEIGHT,
      height: Math.max(((ends[i] - starts[i]) / 60) * ROW_HEIGHT, 36),
      lane: lanes[i],
    }));

    const rawWarnings = findTravelWarnings(sorted, travelMatrix);
    const warnings = rawWarnings.map((w) => {
      const fromIdx = sorted.findIndex((s) => s.id === w.fromScreeningId);
      const toIdx = sorted.findIndex((s) => s.id === w.toScreeningId);
      const midMinutes = (ends[fromIdx] + starts[toIdx]) / 2;
      return { top: ((midMinutes - hourStart * 60) / 60) * ROW_HEIGHT, gapMin: w.gapMin };
    });

    return { date, blocks, warnings };
  });

  return { hourStart, hourEnd, hours, columns };
}

export { LANE_STAGGER };
