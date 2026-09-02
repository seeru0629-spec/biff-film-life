import type { ScreeningWithDetails, VenueTravelTime } from "./types";
import { findTravelWarnings } from "./travel";

export const ROW_HEIGHT = 64; // px per hour

function toMinutes(hms: string) {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
}

export type DayLayout = {
  venues: { id: string; name: string }[];
  hourStart: number;
  hourEnd: number;
  hours: number[];
  blocks: {
    screening: ScreeningWithDetails;
    venueIndex: number;
    top: number;
    height: number;
  }[];
  warnings: { top: number; gapMin: number; requiredMin: number }[];
};

export function buildDayLayout(
  dayScreenings: ScreeningWithDetails[],
  travelMatrix: VenueTravelTime[]
): DayLayout {
  const sorted = [...dayScreenings].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const venueMap = new Map<string, string>();
  for (const s of sorted) venueMap.set(s.venue_id, s.venue.name);
  const venues = Array.from(venueMap.entries()).map(([id, name]) => ({ id, name }));

  const starts = sorted.map((s) => toMinutes(s.start_time));
  const ends = sorted.map((s) =>
    s.end_time ? toMinutes(s.end_time) : toMinutes(s.start_time) + (s.film.runtime_min ?? 90)
  );
  const hourStart = Math.max(0, Math.floor(Math.min(...starts, 9 * 60) / 60));
  const hourEnd = Math.min(24, Math.ceil(Math.max(...ends, 18 * 60) / 60));
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i);

  const blocks = sorted.map((s, i) => {
    const venueIndex = venues.findIndex((v) => v.id === s.venue_id);
    const top = ((starts[i] - hourStart * 60) / 60) * ROW_HEIGHT;
    const height = ((ends[i] - starts[i]) / 60) * ROW_HEIGHT;
    return { screening: s, venueIndex, top, height: Math.max(height, 36) };
  });

  const rawWarnings = findTravelWarnings(sorted, travelMatrix);
  const warnings = rawWarnings.map((w) => {
    const fromIdx = sorted.findIndex((s) => s.id === w.fromScreeningId);
    const toIdx = sorted.findIndex((s) => s.id === w.toScreeningId);
    const midMinutes = (ends[fromIdx] + starts[toIdx]) / 2;
    const top = ((midMinutes - hourStart * 60) / 60) * ROW_HEIGHT;
    return { top, gapMin: w.gapMin, requiredMin: w.requiredMin };
  });

  return { venues, hourStart, hourEnd, hours, blocks, warnings };
}
