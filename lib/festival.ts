export const FESTIVAL_NAME = "제31회 부산국제영화제";
export const FESTIVAL_START = "2026-10-06";
export const FESTIVAL_END = "2026-10-15";

export function festivalDates(): string[] {
  const dates: string[] = [];
  const cur = new Date(`${FESTIVAL_START}T00:00:00`);
  const end = new Date(`${FESTIVAL_END}T00:00:00`);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const WEEKDAY_KOR = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayKor(dateStr: string) {
  return WEEKDAY_KOR[new Date(`${dateStr}T00:00:00`).getDay()];
}

/** 오늘 기준 D-day 텍스트. 시작 전엔 D-n, 기간 중엔 D-DAY, 종료 후엔 종료. */
export function ddayLabel(today: Date = new Date()): string {
  const t = new Date(today.toISOString().slice(0, 10));
  const start = new Date(FESTIVAL_START);
  const end = new Date(FESTIVAL_END);
  const oneDay = 24 * 60 * 60 * 1000;
  if (t < start) {
    const diff = Math.round((start.getTime() - t.getTime()) / oneDay);
    return `D-${diff}`;
  }
  if (t <= end) return "D-DAY";
  return "종료";
}
