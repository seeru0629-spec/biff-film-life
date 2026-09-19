import type { TimetableItem, VenueTravelTime } from "./types";

export type TravelWarning = {
  fromScreeningId: string;
  toScreeningId: string;
  gapMin: number;
  requiredMin: number;
};

function toMinutes(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
}

/** 자정을 넘겨 끝나는 회차(예: 22:30~00:05)의 end < start 문제를 보정한다 (lib/timetable.ts의 toEndMinutes와 동일한 이유, 2026-09-19). */
function toEndMinutes(startMin: number, endHms: string) {
  const raw = toMinutes(endHms);
  return raw < startMin ? raw + 24 * 60 : raw;
}

function travelMinBetween(
  fromVenueId: string | null,
  toVenueId: string | null,
  matrix: VenueTravelTime[]
): number {
  if (!fromVenueId || !toVenueId || fromVenueId === toVenueId) return 0;
  const hit =
    matrix.find((t) => t.from_venue_id === fromVenueId && t.to_venue_id === toVenueId) ??
    matrix.find((t) => t.from_venue_id === toVenueId && t.to_venue_id === fromVenueId);
  return hit?.travel_min ?? 0;
}

/** 같은 날짜의 항목들(시작시각 오름차순 정렬, 영화/행사 혼합 가능)을 받아 이동시간 촉박 구간을 찾는다.
 * SaveImageSheet(저장 이미지)에서 "문제 있을 때만" 보여주는 용도로 계속 쓰인다. */
export function findTravelWarnings(
  sameDayItems: TimetableItem[],
  travelMatrix: VenueTravelTime[]
): TravelWarning[] {
  const sorted = [...sameDayItems].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );
  const warnings: TravelWarning[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (cur.venue_id === next.venue_id) continue;
    const curStart = toMinutes(cur.start_time);
    const curEnd = cur.end_time ? toEndMinutes(curStart, cur.end_time) : curStart + (cur.runtime_min ?? 0);
    const gapMin = toMinutes(next.start_time) - curEnd;
    const requiredMin = travelMinBetween(cur.venue_id, next.venue_id, travelMatrix);
    if (requiredMin > 0 && gapMin < requiredMin) {
      warnings.push({ fromScreeningId: cur.id, toScreeningId: next.id, gapMin, requiredMin });
    }
  }
  return warnings;
}

export type ScheduleGap = {
  fromScreeningId: string;
  toScreeningId: string;
  gapMin: number;
  requiredMin: number;
  isTight: boolean;
};

/** 같은 날짜의 연속된 두 일정 사이 간격을 장소가 같아도 전부 계산한다 — 시간표 화면에
 * "다음 상영까지 OO분"을 항상 보여주기 위한 용도(2026-09-19, 사용자 피드백). isTight 조건은
 * findTravelWarnings와 동일해서 부족한 구간은 화면에서 그대로 경고 스타일로 구분할 수 있다. */
export function computeScheduleGaps(
  sameDayItems: TimetableItem[],
  travelMatrix: VenueTravelTime[]
): ScheduleGap[] {
  const sorted = [...sameDayItems].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );
  const gaps: ScheduleGap[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    const curStart = toMinutes(cur.start_time);
    const curEnd = cur.end_time ? toEndMinutes(curStart, cur.end_time) : curStart + (cur.runtime_min ?? 0);
    const gapMin = toMinutes(next.start_time) - curEnd;
    const requiredMin = travelMinBetween(cur.venue_id, next.venue_id, travelMatrix);
    gaps.push({
      fromScreeningId: cur.id,
      toScreeningId: next.id,
      gapMin,
      requiredMin,
      isTight: requiredMin > 0 && gapMin < requiredMin,
    });
  }
  return gaps;
}
