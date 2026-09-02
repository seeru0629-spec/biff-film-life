import { unwatch } from "@/app/actions";
import { getWatchItemsForViewer } from "@/lib/queries";
import { fmtDateWithWeekday, fmtTime } from "@/lib/format";
import { PushPermissionBanner } from "@/components/PushPermissionBanner";
import { StatusDot } from "@/components/ui";

const STATUS_COLOR: Record<string, string> = {
  감시중: "#2563EB",
  알림완료: "#16A34A",
  해제됨: "#9A9187",
};

export default async function WatchlistPage({ params }: PageProps<"/s/[token]/watchlist">) {
  const { token } = await params;
  const items = await getWatchItemsForViewer(token);
  const watching = items.filter((i) => i.status === "감시중");
  const history = items.filter((i) => i.status !== "감시중");

  return (
    <div className="px-4 pt-16">
      <div className="mb-3.5 text-[24px] font-extrabold tracking-tight">취소표 알림</div>

      <PushPermissionBanner token={token} />

      <div className="mb-2.5 flex items-center gap-1.5">
        <StatusDot color={STATUS_COLOR["감시중"]} />
        <span className="text-[14px] font-bold">감시 중</span>
        <span className="text-[12px] text-text-faint">{watching.length}건 · 1~2분 간격 확인</span>
      </div>

      {watching.length === 0 ? (
        <div className="mb-6 rounded-[13px] border border-border bg-card p-6 text-center text-[13px] text-text-faint">
          감시 중인 회차가 없어요
        </div>
      ) : (
        <div className="mb-6 flex flex-col gap-2.5">
          {watching.map((item) => (
            <div key={item.id} className="rounded-[13px] border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex-1">
                  <div className="mb-1 text-[14px] font-bold">{item.screening.film.title_kor}</div>
                  <div className="tabular text-[12.5px] text-text-muted">
                    {fmtDateWithWeekday(item.screening.screen_date)} {fmtTime(item.screening.start_time)} ·{" "}
                    {item.screening.venue.name}
                  </div>
                </div>
                <form action={unwatch.bind(null, token, item.screening_id)}>
                  <button className="flex-none rounded-lg border border-border-2 px-2.75 py-2 text-[12px] font-semibold text-text-muted">
                    해제
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <div className="mb-2.5 text-[14px] font-bold">이력</div>
          <div className="flex flex-col gap-2.5">
            {history.map((item) => (
              <div key={item.id} className="rounded-[13px] border border-border bg-card p-3.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <StatusDot color={STATUS_COLOR[item.status]} />
                  <span className="text-[12px] font-medium text-text-muted">{item.status}</span>
                </div>
                <div className="mb-0.5 text-[14px] font-bold">{item.screening.film.title_kor}</div>
                <div className="tabular text-[12.5px] text-text-muted">
                  {fmtDateWithWeekday(item.screening.screen_date)} {fmtTime(item.screening.start_time)} ·{" "}
                  {item.screening.venue.name}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
