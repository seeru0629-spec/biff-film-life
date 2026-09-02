import Link from "next/link";
import { getScheduleForViewer, getVenueTravelTimes } from "@/lib/queries";
import { buildDayLayout, ROW_HEIGHT } from "@/lib/timetable";
import { festivalDates, weekdayKor } from "@/lib/festival";
import { fmtMonthDay } from "@/lib/format";
import { ScheduleBlock } from "@/components/ScheduleBlock";
import { SaveImageSheet } from "@/components/SaveImageSheet";
import { EmptyState } from "@/components/ui";

export default async function SchedulePage({ params, searchParams }: PageProps<"/s/[token]/schedule">) {
  const { token } = await params;
  const sp = await searchParams;

  const [schedule, travelMatrix] = await Promise.all([getScheduleForViewer(token), getVenueTravelTimes()]);
  const screenings = schedule.map((s) => s.screening);

  if (screenings.length === 0) {
    return (
      <div className="px-4 pt-16">
        <div className="mb-4.5 text-[24px] font-extrabold tracking-tight">내 시간표</div>
        <EmptyState
          title="아직 담은 회차가 없어요"
          description="관심 있는 상영작을 찾아 회차를 담아보세요"
          ctaLabel="상영작 둘러보기"
          ctaHref={`/s/${token}/films`}
        />
      </div>
    );
  }

  const byDate = new Map<string, typeof screenings>();
  for (const s of screenings) byDate.set(s.screen_date, [...(byDate.get(s.screen_date) ?? []), s]);
  const datesWithItems = Array.from(byDate.keys()).sort();

  const requestedDate = typeof sp.date === "string" ? sp.date : undefined;
  const selectedDate = requestedDate && byDate.has(requestedDate) ? requestedDate : datesWithItems[0];
  const dayScreenings = byDate.get(selectedDate) ?? [];
  const layout = buildDayLayout(dayScreenings, travelMatrix);
  const totalHeight = layout.hours.length * ROW_HEIGHT;

  const exportGroups = datesWithItems.map((date) => ({ date, screenings: byDate.get(date)! }));

  return (
    <div>
      <div className="px-4 pt-16">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[24px] font-extrabold tracking-tight">내 시간표</span>
          <span className="text-[12.5px] text-text-faint">총 {screenings.length}편</span>
        </div>
        <div className="mb-3.5 flex gap-1.75 overflow-x-auto pb-1">
          {festivalDates().map((date) => {
            const has = byDate.has(date);
            const active = date === selectedDate;
            return (
              <Link
                key={date}
                href={has ? `/s/${token}/schedule?date=${date}` : "#"}
                aria-disabled={!has}
                className={`flex w-[50px] flex-none flex-col items-center rounded-[11px] py-2 text-center ${
                  active ? "bg-ink-2" : "bg-skeleton-2"
                } ${!has ? "pointer-events-none opacity-40" : ""}`}
              >
                <span className={`mb-1 text-[10px] ${active ? "text-white/60" : "text-text-faint"}`}>
                  {weekdayKor(date)}
                </span>
                <span className={`tabular text-[14px] ${active ? "font-bold text-white" : "font-semibold"}`}>
                  {fmtMonthDay(date)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-4 overflow-hidden rounded-[14px] border border-border bg-card">
        <div
          className="grid border-b border-hairline bg-[#FCFAF7]"
          style={{ gridTemplateColumns: `42px repeat(${layout.venues.length || 1}, 1fr)` }}
        >
          <div />
          {layout.venues.map((v) => (
            <div key={v.id} className="border-l border-hairline px-1 py-2.25 text-center text-[10px] font-semibold text-text-muted">
              {v.name}
            </div>
          ))}
        </div>

        <div className="relative flex" style={{ height: totalHeight }}>
          <div className="relative w-[42px] flex-none">
            {layout.hours.map((h, i) => (
              <div
                key={h}
                className="tabular absolute left-2 text-[10px] font-medium text-icon-muted"
                style={{ top: i * ROW_HEIGHT + 4 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {layout.venues.map((v, colIdx) => (
            <div
              key={v.id}
              className="relative flex-1 border-l border-hairline"
              style={{
                backgroundImage: `repeating-linear-gradient(#fff 0 ${ROW_HEIGHT - 1}px, #F4F0E9 ${ROW_HEIGHT - 1}px ${ROW_HEIGHT}px)`,
              }}
            >
              {layout.blocks
                .filter((b) => b.venueIndex === colIdx)
                .map((b) => (
                  <ScheduleBlock
                    key={b.screening.id}
                    token={token}
                    screening={b.screening}
                    style={{ top: b.top, left: 4, right: 4, height: b.height }}
                  />
                ))}
            </div>
          ))}

          {layout.warnings.map((w, i) => (
            <div
              key={i}
              className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-warn-red px-2.25 py-1.5 text-white shadow-lg"
              style={{ top: w.top - 12 }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-[10px] font-bold">
                이동시간 촉박 · {w.gapMin}분 / 필요 {w.requiredMin}분
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[190px]" />

      <SaveImageSheet groups={exportGroups} travelMatrix={travelMatrix} />
    </div>
  );
}
