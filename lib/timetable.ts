import type { TimetableItem, VenueTravelTime } from "./types";
import { computeScheduleGaps } from "./travel";

export const ROW_HEIGHT = 64; // px per hour
const LANE_STAGGER = 12; // px : 겹치는 항목이 있을 때 뒤 블록을 앞 블록 오른쪽으로 살짝 밀어 겹쳐 쌓는다

function toMinutes(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
}

/** 자정을 넘겨 끝나는 회차(예: 22:30~00:05, 23:59~01:54)는 end가 start보다 작게 나와 음수 길이가
 * 되던 버그(2026-09-19)를 막는다. 다음날로 넘어간 것으로 보고 +24h 보정 — 새벽 상영은 실제로 꽤
 * 흔해서(2026-10 기준 회차의 3.5%가 자정을 넘김, 그 중 다수는 23:59 시작이라 상영시간 대부분이
 * 자정 이후) 24:00에서 그냥 잘라버리면 이 회차들도 다시 최소 높이로 눌린다. 그리드의 hourEnd는
 * 이 값을 반영해 24시 이후로도 늘어난다.*/
function toEndMinutes(startMin: number, endHms: string) {
  const raw = toMinutes(endHms);
  return raw < startMin ? raw + 24 * 60 : raw;
}

export type DayColumn = {
  date: string;
  blocks: {
    item: TimetableItem;
    top: number;
    height: number;
    lane: number; // 0 = 겹침 없음/첫 블록, 1+ = 겹쳐서 뒤로 밀린 순번
  }[];
  gaps: { top: number; gapMin: number; isTight: boolean }[];
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
  // 새벽까지 넘어가는 회차를 온전히 보여주려면 24시를 넘어설 수 있어야 한다 — 30(다음날 06:00)은
  // 잘못된 데이터가 그리드를 무한정 늘리는 걸 막는 안전판일 뿐, 실제 심야 상영은 이 안에 다 들어온다.
  const hourEnd = Math.min(30, Math.ceil(Math.max(...allEnds, 18 * 60) / 60));
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

    // computeScheduleGaps도 동일하게 start_time 오름차순 정렬해 연속 쌍을 순회하므로
    // gaps[i]는 항상 sorted[i]->sorted[i+1] 구간과 1:1 대응한다.
    const rawGaps = computeScheduleGaps(sorted, travelMatrix);
    const gaps = rawGaps.map((g, i) => {
      const midMinutes = (ends[i] + starts[i + 1]) / 2;
      return { top: ((midMinutes - hourStart * 60) / 60) * ROW_HEIGHT, gapMin: g.gapMin, isTight: g.isTight };
    });

    return { date, blocks, gaps };
  });

  return { hourStart, hourEnd, hours, columns };
}

export { LANE_STAGGER };
