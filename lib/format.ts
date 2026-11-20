import { weekdayKor } from "./festival";

export function fmtTime(hms: string) {
  if (!hms || typeof hms !== "string") return "";
  return hms.slice(0, 5);
}

export function fmtTimeRange(start: string, end: string | null) {
  if (!start) return "";
  return end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
}

export function fmtDateWithWeekday(dateStr: string) {
  if (!dateStr || typeof dateStr !== "string") return "";
  return `${dateStr} (${weekdayKor(dateStr)})`;
}

export function fmtMonthDay(dateStr: string) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  return `${parts[1]}.${parts[2]}`;
}

export function fmtRelativeTime(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return fmtDateWithWeekday(iso.slice(0, 10));
}
