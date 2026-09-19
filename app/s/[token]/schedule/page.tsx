import { getScheduleForViewer, getVenueTravelTimes } from "@/lib/queries";
import { buildMultiDayLayout, ROW_HEIGHT } from "@/lib/timetable";
import { weekdayKor } from "@/lib/festival";
import { fmtMonthDay } from "@/lib/format";
import { ScheduleBlock } from "@/components/ScheduleBlock";
import { ScheduleSelectionProvider, ScheduleToolbar } from "@/components/ScheduleSelection";
import { SaveImageSheet } from "@/components/SaveImageSheet";
import { EmptyState } from "@/components/ui";

// 하루 컬럼의 최소 폭 — 일정 있는 날짜 수가 적으면 이보다 넓게 늘어나 화면을 채우고,
// 많으면(에브리타임처럼 전체 기간을 한 그리드에) 이 폭 밑으로는 안 줄어들고 가로 스크롤된다.
const DAY_COLUMN_MIN_WIDTH = 96;

export default async function SchedulePage({ params }: PageProps<"/s/[token]/schedule">) {
  const { token } = await params;

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
  // 일정이 없는 날짜는 애초에 이 목록에 안 잡히므로 컬럼도 안 생긴다.
  const datesWithItems = Array.from(byDate.keys()).sort();

  const layout = buildMultiDayLayout(datesWithItems, byDate, travelMatrix);
  const totalHeight = layout.hours.length * ROW_HEIGHT;
  const gridTemplateColumns = `42px repeat(${datesWithItems.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`;

  const exportGroups = datesWithItems.map((date) => ({ date, items: byDate.get(date)! }));

  return (
    <ScheduleSelectionProvider>
      <div className="px-4 pt-16">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[24px] font-extrabold tracking-tight">내 시간표</span>
          <span className="text-[12.5px] text-text-faint">총 {items.length}건</span>
        </div>
        <div className="mb-3.5 flex justify-end">
          <ScheduleToolbar token={token} />
        </div>
      </div>

      <div className="mx-4 overflow-hidden rounded-[14px] border border-border bg-card">
        {/* 헤더(날짜)와 그리드(시간+블록)를 하나의 가로 스크롤 컨테이너에 같이 넣어야 스크롤이
            동기화된다 — 따로 스크롤되면 날짜 라벨이 자기 컬럼과 어긋난다. */}
        <div className="overflow-x-auto">
          <div className="grid border-b border-hairline bg-[#FCFAF7]" style={{ gridTemplateColumns }}>
            <div className="sticky left-0 z-20 bg-[#FCFAF7]" style={{ willChange: "transform" }} />
            {datesWithItems.map((date) => (
              <div key={date} className="border-l border-hairline bg-[#FCFAF7] px-1 py-2.25 text-center">
                <div className="text-[10px] font-medium text-text-faint">{weekdayKor(date)}요일</div>
                <div className="tabular text-[12.5px] font-semibold">{fmtMonthDay(date)}</div>
              </div>
            ))}
          </div>

          <div className="relative grid" style={{ gridTemplateColumns, height: totalHeight }}>
            <div className="sticky left-0 z-20 bg-card" style={{ willChange: "transform" }}>
              {layout.hours.map((h, i) => (
                <div
                  key={h}
                  className="tabular absolute left-2 text-[10px] font-medium text-icon-muted"
                  style={{ top: i * ROW_HEIGHT + 4 }}
                >
                  {String(h % 24).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {layout.columns.map((col) => (
              <div
                key={col.date}
                className="relative border-l border-hairline"
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

                {col.gaps.map((g, i) => (
                  <div
                    key={i}
                    className={`absolute left-1 right-1 z-10 flex -translate-y-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1.5 py-1 ${
                      g.isTight
                        ? "bg-warn-red text-white shadow-lg"
                        : "border border-border-2 bg-white/90 text-text-faint"
                    }`}
                    style={{ top: g.top }}
                  >
                    {g.isTight && <span className="h-1 w-1 flex-none rounded-full bg-white" />}
                    <span className="truncate text-[9px] font-semibold">
                      {g.isTight ? `${g.gapMin}분 부족` : `다음 상영까지 ${g.gapMin}분`}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[190px]" />

      <SaveImageSheet groups={exportGroups} travelMatrix={travelMatrix} initialDate={datesWithItems[0]} />
    </ScheduleSelectionProvider>
  );
}
