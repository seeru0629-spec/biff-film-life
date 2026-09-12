import Link from "next/link";
import { getScheduleForViewer, getVenueTravelTimes } from "@/lib/queries";
import { buildMultiDayLayout, ROW_HEIGHT } from "@/lib/timetable";
import { weekdayKor } from "@/lib/festival";
import { fmtMonthDay } from "@/lib/format";
import { ScheduleBlock } from "@/components/ScheduleBlock";
import { SaveImageSheet } from "@/components/SaveImageSheet";
import { EmptyState } from "@/components/ui";

const CHUNK_SIZE = 3;

function chunkDates(dates: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < dates.length; i += size) chunks.push(dates.slice(i, i + size));
  return chunks;
}

export default async function SchedulePage({ params, searchParams }: PageProps<"/s/[token]/schedule">) {
  const { token } = await params;
  const sp = await searchParams;

  const [items, travelMatrix] = await Promise.all([getScheduleForViewer(token), getVenueTravelTimes()]);

  if (items.length === 0) {
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

  const byDate = new Map<string, typeof items>();
  for (const s of items) byDate.set(s.screen_date, [...(byDate.get(s.screen_date) ?? []), s]);
  const datesWithItems = Array.from(byDate.keys()).sort();

  const chunks = chunkDates(datesWithItems, CHUNK_SIZE);
  const requestedDate = typeof sp.date === "string" ? sp.date : undefined;
  const requestedChunkIdx = requestedDate ? chunks.findIndex((c) => c.includes(requestedDate)) : -1;
  const activeChunkIdx = requestedChunkIdx >= 0 ? requestedChunkIdx : 0;
  const activeDates = chunks[activeChunkIdx];

  const layout = buildMultiDayLayout(activeDates, byDate, travelMatrix);
  const totalHeight = layout.hours.length * ROW_HEIGHT;

  const exportGroups = datesWithItems.map((date) => ({ date, items: byDate.get(date)! }));

  return (
    <div>
      <div className="px-4 pt-16">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[24px] font-extrabold tracking-tight">내 시간표</span>
          <span className="text-[12.5px] text-text-faint">총 {items.length}건</span>
        </div>
        <div className="mb-3.5 flex gap-1.75 overflow-x-auto pb-1">
          {chunks.map((c, i) => {
            const active = i === activeChunkIdx;
            return (
              <Link
                key={c[0]}
                href={`/s/${token}/schedule?date=${c[0]}`}
                className={`flex flex-none flex-col items-center rounded-[11px] px-3 py-2 text-center ${
                  active ? "bg-ink-2" : "bg-skeleton-2"
                }`}
              >
                <span className={`mb-1 text-[10px] ${active ? "text-white/60" : "text-text-faint"}`}>
                  {c.map((d) => weekdayKor(d)).join("·")}
                </span>
                <span className={`tabular text-[13px] ${active ? "font-bold text-white" : "font-semibold"}`}>
                  {c.map((d) => fmtMonthDay(d)).join(" · ")}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-4 overflow-hidden rounded-[14px] border border-border bg-card">
        <div
          className="grid border-b border-hairline bg-[#FCFAF7]"
          style={{ gridTemplateColumns: `42px repeat(${activeDates.length}, 1fr)` }}
        >
          <div />
          {activeDates.map((date) => (
            <div key={date} className="border-l border-hairline px-1 py-2.25 text-center">
              <div className="text-[10px] font-medium text-text-faint">{weekdayKor(date)}요일</div>
              <div className="tabular text-[12.5px] font-semibold">{fmtMonthDay(date)}</div>
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

          {layout.columns.map((col) => (
            <div
              key={col.date}
              className="relative flex-1 border-l border-hairline"
              style={{
                backgroundImage: `repeating-linear-gradient(#fff 0 ${ROW_HEIGHT - 1}px, #F4F0E9 ${ROW_HEIGHT - 1}px ${ROW_HEIGHT}px)`,
              }}
            >
              {col.blocks.map((b) => (
                <ScheduleBlock
                  key={b.item.id}
                  token={token}
                  item={b.item}
                  top={b.top}
                  height={b.height}
                  lane={b.lane}
                />
              ))}

              {col.warnings.map((w, i) => (
                <div
                  key={i}
                  className="absolute left-1 right-1 z-20 flex -translate-y-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-warn-red px-1.5 py-1 text-white shadow-lg"
                  style={{ top: w.top }}
                >
                  <span className="h-1 w-1 flex-none rounded-full bg-white" />
                  <span className="truncate text-[9px] font-bold">{w.gapMin}분 부족</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="h-[190px]" />

      <SaveImageSheet groups={exportGroups} travelMatrix={travelMatrix} />
    </div>
  );
}
