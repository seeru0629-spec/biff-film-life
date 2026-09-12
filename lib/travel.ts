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

/** 같은 날짜의 항목들(시작시각 오름차순 정렬, 영화/행사 혼합 가능)을 받아 이동시간 촉박 구간을 찾는다. */
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
    const curEnd = cur.end_time ? toMinutes(cur.end_time) : toMinutes(cur.start_time) + (cur.runtime_min ?? 0);
    const gapMin = toMinutes(next.start_time) - curEnd;
    const requiredMin = travelMinBetween(cur.venue_id, next.venue_id, travelMatrix);
    if (requiredMin > 0 && gapMin < requiredMin) {
      warnings.push({ fromScreeningId: cur.id, toScreeningId: next.id, gapMin, requiredMin });
    }
  }
  return warnings;
}
