import Link from "next/link";
import { getScheduleForViewer, getVenueTravelTimes, getVenues } from "@/lib/queries";
import { ddayLabel, FESTIVAL_END, FESTIVAL_NAME, FESTIVAL_START } from "@/lib/festival";
import { findTravelWarnings } from "@/lib/travel";
import { fmtTimeRange } from "@/lib/format";
import { TravelTimeTable } from "@/components/TravelTimeTable";
import { ShareAppButton } from "@/components/ShareAppButton";

export default async function HomePage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const [schedule, venues, travelMatrix] = await Promise.all([
    getScheduleForViewer(token),
    getVenues(),
    getVenueTravelTimes(),
  ]);

  const screenings = schedule.map((s) => s.screening).sort((a, b) => `${a.screen_date}${a.start_time}`.localeCompare(`${b.screen_date}${b.start_time}`));
  const next = screenings[0];

  const byDate = new Map<string, typeof screenings>();
  for (const s of screenings) byDate.set(s.screen_date, [...(byDate.get(s.screen_date) ?? []), s]);
  const allWarnings = Array.from(byDate.entries()).flatMap(([date, list]) =>
    findTravelWarnings(list, travelMatrix).map((w) => ({ ...w, date }))
  );
  const nextDateWarnings = next ? allWarnings.filter((w) => w.date === next.screen_date) : [];

  return (
    <div>
      <div className="relative overflow-hidden rounded-b-[22px] bg-ink-2 px-5 pb-6 pt-16 text-white">
        <div className="absolute -right-12 -top-12 h-[190px] w-[190px] rounded-full bg-biff-red opacity-20" />
        <div className="relative">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-festival-yellow">
              {FESTIVAL_NAME}
            </span>
            <ShareAppButton />
          </div>
          <div className="mb-1.5 flex items-end gap-2.5">
            <span className="tabular text-[46px] font-extrabold leading-none tracking-tight">{ddayLabel()}</span>
            <span className="pb-1 text-[13px] font-medium text-white/60">
              {FESTIVAL_START} → {FESTIVAL_END.slice(5)}
            </span>
          </div>
          <div className="text-[13px] text-white/70">
            담은 회차 <b className="text-white">{screenings.length}</b>편
          </div>
        </div>
      </div>

      <div className="px-4 pt-4.5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[15px] font-bold">내 시간표 미리보기</span>
          <Link href={`/s/${token}/schedule`} className="text-[12.5px] font-medium text-biff-red">
            전체 보기 ›
          </Link>
        </div>
        {next ? (
          <div className="rounded-[14px] border border-border bg-card p-3.5 shadow-sm">
            <div className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-text-faint">
              다음 회차 · {next.screen_date}
            </div>
            <div className="flex gap-3 border-b border-hairline pb-3">
              <div className="w-[3px] rounded-full bg-biff-red" />
              <div className="flex-1">
                <div className="mb-0.5 text-[14.5px] font-semibold">{next.film.title_kor}</div>
                <div className="tabular text-[12.5px] text-text-muted">
                  {fmtTimeRange(next.start_time, next.end_time)} · {next.venue.name}
                </div>
              </div>
            </div>
            {nextDateWarnings.length > 0 && (
              <div className="flex items-center gap-1.5 pt-2.5">
                <span className="h-[7px] w-[7px] flex-none rounded-full bg-warn-red" />
                <span className="text-[12px] font-semibold text-warn-red">
                  이동시간 촉박 {nextDateWarnings.length}건
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[14px] border border-border bg-card p-6 text-center text-[13px] text-text-faint">
            아직 담은 회차가 없어요 ·{" "}
            <Link href={`/s/${token}/films`} className="font-semibold text-biff-red">
              상영작 둘러보기
            </Link>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <TravelTimeTable venues={venues} matrix={travelMatrix} />
      </div>
    </div>
  );
}
