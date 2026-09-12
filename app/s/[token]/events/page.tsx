import Image from "next/image";
import Link from "next/link";
import { getEvents, getEventSections } from "@/lib/queries";
import { SectionBadge } from "@/components/ui";

export default async function EventsPage({
  params,
  searchParams,
}: PageProps<"/s/[token]/events">) {
  const { token } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const section = typeof sp.section === "string" ? sp.section : undefined;

  const [events, sections] = await Promise.all([
    getEvents({ search: q, section }),
    getEventSections(),
  ]);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-surface px-4 pt-16">
        <div className="mb-3.5 text-[24px] font-extrabold tracking-tight">행사</div>
        <form method="get" className="mb-3.5 flex items-center gap-2.5 rounded-xl border border-border-2 bg-card px-3.5 py-2.5">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A69C90" strokeWidth="2.1" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="제목·진행자로 검색"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-icon-muted"
          />
          {section && <input type="hidden" name="section" value={section} />}
        </form>
        <div className="mb-3.5 flex gap-2 overflow-x-auto pb-1">
          <Link
            href={`/s/${token}/events`}
            className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold ${
              !section ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
            }`}
          >
            전체
          </Link>
          {sections.map((s) => (
            <Link
              key={s}
              href={`/s/${token}/events?section=${encodeURIComponent(s)}`}
              className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold ${
                section === s ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-6">
        {events.length === 0 && (
          <div className="rounded-[14px] border border-border bg-card p-8 text-center text-[13px] text-text-faint">
            해당하는 행사가 없어요
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="relative flex gap-3 rounded-[14px] border border-border bg-card p-3">
            <Link href={`/s/${token}/events/${event.id}`} className="absolute inset-0 z-0" aria-label={event.title} />
            <Image
              src={event.still_image_url || "/icons/icon-192.png"}
              alt={`${event.title} 이미지`}
              width={92}
              height={92}
              className="h-[92px] w-[92px] flex-none rounded-lg bg-skeleton object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {event.section && <SectionBadge>{event.section}</SectionBadge>}
              </div>
              <div className="mb-0.5 truncate text-[15px] font-bold">{event.title}</div>
              {event.host && <div className="truncate text-[12.5px] text-text-muted">{event.host}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
