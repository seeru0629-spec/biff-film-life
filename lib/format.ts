import { weekdayKor } from "./festival";

export function fmtTime(hms: string) {
  return hms.slice(0, 5);
}

export function fmtTimeRange(start: string, end: string | null) {
  return end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
}

export function fmtDateWithWeekday(dateStr: string) {
  return `${dateStr} (${weekdayKor(dateStr)})`;
}

export function fmtMonthDay(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${m}.${d}`;
}
