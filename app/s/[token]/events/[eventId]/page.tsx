import Image from "next/image";
import Link from "next/link";
import { addEventToSchedule, removeEventFromSchedule } from "@/app/actions";
import { getEvent, getSessionsForEvent, isEventSessionInSchedule } from "@/lib/queries";
import { fmtDateWithWeekday, fmtTime } from "@/lib/format";
import { SectionBadge } from "@/components/ui";

export default async function EventDetailPage({ params }: PageProps<"/s/[token]/events/[eventId]">) {
  const { token, eventId } = await params;
  const [event, sessions] = await Promise.all([getEvent(eventId), getSessionsForEvent(eventId)]);

  const sessionStates = await Promise.all(
    sessions.map(async (s) => ({
      session: s,
      inSchedule: await isEventSessionInSchedule(token, s.id),
    }))
  );

  return (
    <div>
      <div className="bg-ink-2 px-4 pb-5.5 pt-16 text-white">
        <Link href={`/s/${token}/events`} className="mb-5 flex items-center gap-3.5 text-[14px] font-medium text-white/60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
          행사
        </Link>
        <div className="flex gap-3.5">
          <Image
            src={event.still_image_url || "/icons/icon-192.png"}
            alt={`${event.title} 이미지`}
            width={124}
            height={124}
            className="h-[124px] w-[124px] flex-none rounded-[10px] bg-white/10 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {event.section && <SectionBadge>{event.section}</SectionBadge>}
            </div>
            <div className="mb-1 text-[21px] font-extrabold tracking-tight">{event.title}</div>
            {event.host && <div className="text-[13px] leading-relaxed text-white/78">{event.host}</div>}
          </div>
        </div>
      </div>

      {event.synopsis && (
        <div className="px-4 pt-5">
          <div className="mb-2.5 text-[14px] font-bold">소개</div>
          <div className="text-[14px] leading-[1.75] text-[#3F3830]" style={{ textWrap: "pretty" }}>
            {event.synopsis}
          </div>
        </div>
      )}

      <div className="px-4 pt-5.5">
        <div className="mb-2.5 flex items-baseline gap-2">
          <span className="text-[14px] font-bold">일정</span>
          <span className="text-[12px] text-text-faint">{sessions.length}회차</span>
        </div>

        {sessions.length === 0 && (
          <div className="rounded-[13px] border border-border bg-card p-5 text-[13px] text-text-faint">
            등록된 일정이 없어요
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {sessionStates.map(({ session, inSchedule }) => (
            <div key={session.id} className="flex items-center gap-3 rounded-[13px] border border-border bg-card p-3.5">
              <div className="flex-1">
                <div className="tabular mb-1 flex items-center gap-1.5 text-[14px] font-semibold">
                  {fmtDateWithWeekday(session.session_date)} {fmtTime(session.start_time)}
                </div>
                <div className="text-[12.5px] text-text-muted">
                  {session.venue?.name ?? session.venue_name}
                </div>
              </div>

              {inSchedule ? (
                <form action={removeEventFromSchedule.bind(null, token, session.id)}>
                  <button className="flex-none rounded-[9px] bg-ink-2 px-3.5 py-2.5 text-[12.5px] font-semibold text-white">
                    담김 ✓
                  </button>
                </form>
              ) : (
                <form action={addEventToSchedule.bind(null, token, session.id)}>
                  <button className="flex-none rounded-[9px] bg-biff-red px-3.5 py-2.5 text-[12.5px] font-semibold text-white">
                    시간표에 추가
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
