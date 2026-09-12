import Image from "next/image";
import Link from "next/link";
import { addToSchedule, removeFromSchedule } from "@/app/actions";
import {
  getFilmLikeCounts,
  getFilms,
  getFilmSections,
  getLikedFilmIdsForViewer,
  getRatingSummaries,
  getScheduleForViewer,
  getScreeningsByDate,
} from "@/lib/queries";
import { festivalDates, weekdayKor } from "@/lib/festival";
import { fmtMonthDay, fmtTime } from "@/lib/format";
import { HeartButton, SectionBadge, StarDisplay } from "@/components/ui";
import type { ScreeningWithDetails } from "@/lib/types";

export default async function FilmsPage({
  params,
  searchParams,
}: PageProps<"/s/[token]/films">) {
  const { token } = await params;
  const sp = await searchParams;
  const view = sp.view === "date" ? "date" : "title";
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const section = typeof sp.section === "string" ? sp.section : undefined;

  return (
    <div>
      <div className="sticky top-0 z-10 bg-surface px-4 pt-16">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[24px] font-extrabold tracking-tight">상영작</span>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/s/${token}/liked`}
              aria-label="찜한 영화"
              className="flex items-center justify-center rounded-full border border-border-2 bg-card p-1.5 text-biff-red-dark"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7.5-4.6-10-9.2C.4 8.4 2 4.5 5.8 4c2.2-.3 4 .9 6.2 3.4C14.2 4.9 16 3.7 18.2 4c3.8.5 5.4 4.4 3.8 7.8C19.5 16.4 12 21 12 21z" />
              </svg>
            </Link>
            <Link
              href={`/s/${token}/ratings`}
              aria-label="내 별점"
              className="flex items-center justify-center rounded-full border border-border-2 bg-card p-1.5 text-[#F2994A]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.5l2.9 6.06 6.6.77-4.85 4.63 1.25 6.6L12 17.4l-5.9 3.16 1.25-6.6L2.5 9.33l6.6-.77L12 2.5z" />
              </svg>
            </Link>
            <Link
              href={`/s/${token}/popular`}
              className="flex items-center gap-1 rounded-full border border-border-2 bg-card px-3 py-1.5 text-[12.5px] font-semibold text-biff-red-dark"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7.5-4.6-10-9.2C.4 8.4 2 4.5 5.8 4c2.2-.3 4 .9 6.2 3.4C14.2 4.9 16 3.7 18.2 4c3.8.5 5.4 4.4 3.8 7.8C19.5 16.4 12 21 12 21z" />
              </svg>
              인기 상영작
            </Link>
          </div>
        </div>
        <div className="mb-3.5 flex gap-1.5 rounded-[11px] bg-skeleton-2 p-1">
          <Link
            href={`/s/${token}/films`}
            className={`flex-1 rounded-lg py-2.25 text-center text-[13px] ${
              view === "title" ? "bg-white font-semibold shadow-sm" : "font-medium text-text-muted"
            }`}
          >
            작품별
          </Link>
          <Link
            href={`/s/${token}/films?view=date`}
            className={`flex-1 rounded-lg py-2.25 text-center text-[13px] ${
              view === "date" ? "bg-white font-semibold shadow-sm" : "font-medium text-text-muted"
            }`}
          >
            날짜별
          </Link>
        </div>
      </div>

      {view === "date" ? (
        <FilmsByDate token={token} selectedDate={typeof sp.date === "string" ? sp.date : undefined} />
      ) : (
        <FilmsByTitle token={token} q={q} section={section} />
      )}
    </div>
  );
}

async function FilmsByTitle({ token, q, section }: { token: string; q?: string; section?: string }) {
  const [films, sections, likeCounts, likedFilmIds, ratingSummaries] = await Promise.all([
    getFilms({ search: q, section }),
    getFilmSections(),
    getFilmLikeCounts(),
    getLikedFilmIdsForViewer(token),
    getRatingSummaries(),
  ]);

  return (
    <>
      <div className="sticky top-[130px] z-10 bg-surface px-4">
        <form method="get" className="mb-3.5 flex items-center gap-2.5 rounded-xl border border-border-2 bg-card px-3.5 py-2.5">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A69C90" strokeWidth="2.1" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="제목·감독으로 검색"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-icon-muted"
          />
          {section && <input type="hidden" name="section" value={section} />}
        </form>
        <div className="mb-3.5 flex gap-2 overflow-x-auto pb-1">
          <Link
            href={`/s/${token}/films`}
            className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold ${
              !section ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
            }`}
          >
            전체
          </Link>
          {sections.map((s) => (
            <Link
              key={s}
              href={`/s/${token}/films?section=${encodeURIComponent(s)}`}
              className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-medium ${
                section === s ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4">
        <div className="flex items-center justify-between px-0.5 pb-0.5">
          <span className="text-[12px] text-text-faint">전체 {films.length}편</span>
        </div>
        {films.length === 0 && (
          <div className="rounded-[14px] border border-border bg-card p-8 text-center text-[13px] text-text-faint">
            일치하는 상영작이 없어요
          </div>
        )}
        {films.map((film) => (
          <div key={film.id} className="relative flex gap-3 rounded-[14px] border border-border bg-card p-3">
            <Link href={`/s/${token}/films/${film.id}`} className="absolute inset-0 z-0" aria-label={film.title_kor} />
            {film.still_image_url ? (
              <Image
                src={film.still_image_url}
                alt={`${film.title_kor} 스틸`}
                width={92}
                height={92}
                className="h-[92px] w-[92px] flex-none rounded-lg bg-skeleton object-cover"
              />
            ) : (
              <div className="h-[92px] w-[92px] flex-none rounded-lg bg-skeleton" />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {film.section && <SectionBadge>{film.section}</SectionBadge>}
                  {film.is_imported && <SectionBadge tone="ink">수입 · {film.import_distributor}</SectionBadge>}
                  {film.wp_status && <SectionBadge tone="gray">{film.wp_status}</SectionBadge>}
                </div>
                <div className="relative z-10">
                  <HeartButton token={token} filmId={film.id} liked={likedFilmIds.has(film.id)} count={likeCounts.get(film.id) ?? 0} />
                </div>
              </div>
              <div className="mb-0.5 flex items-center gap-2 truncate">
                <span className="truncate text-[15px] font-bold">{film.title_kor}</span>
                <StarDisplay avg={ratingSummaries.get(film.id)?.avg ?? 0} count={ratingSummaries.get(film.id)?.count ?? 0} />
              </div>
              {film.title_eng && <div className="mb-2 truncate text-[12px] text-text-faint">{film.title_eng}</div>}
              <div className="truncate text-[12.5px] text-text-muted">
                {[film.director, film.country, film.runtime_min ? `${film.runtime_min}분` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function FilmsByDate({ token, selectedDate }: { token: string; selectedDate?: string }) {
  const dates = festivalDates();
  const date = selectedDate && dates.includes(selectedDate) ? selectedDate : dates[0];

  const [screenings, schedule] = await Promise.all([getScreeningsByDate(date), getScheduleForViewer(token)]);

  const scheduledIds = new Set(schedule.filter((s) => s.kind === "film").map((s) => s.id));

  const byVenue = new Map<string, ScreeningWithDetails[]>();
  for (const s of screenings) {
    byVenue.set(s.venue.name, [...(byVenue.get(s.venue.name) ?? []), s]);
  }
  const venueGroups = Array.from(byVenue.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <div className="sticky top-[130px] z-10 bg-surface px-4">
        <div className="mb-3.5 flex gap-1.75 overflow-x-auto pb-1">
          {dates.map((d) => (
            <Link
              key={d}
              href={`/s/${token}/films?view=date&date=${d}`}
              className={`flex w-[50px] flex-none flex-col items-center rounded-[11px] py-2 text-center ${
                d === date ? "bg-ink-2" : "bg-skeleton-2"
              }`}
            >
              <span className={`mb-1 text-[10px] ${d === date ? "text-white/60" : "text-text-faint"}`}>
                {weekdayKor(d)}
              </span>
              <span className={`tabular text-[14px] ${d === date ? "font-bold text-white" : "font-semibold"}`}>
                {fmtMonthDay(d)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {screenings.length === 0 && (
          <div className="rounded-[14px] border border-border bg-card p-8 text-center text-[13px] text-text-faint">
            이 날짜엔 등록된 상영 회차가 없어요
          </div>
        )}
        {venueGroups.map(([venueName, list]) => (
          <div key={venueName}>
            <div className="mb-2 text-[13px] font-bold">{venueName}</div>
            <div className="flex flex-col gap-2">
              {list.map((s) => {
                const inSchedule = scheduledIds.has(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-[13px] border border-border bg-card p-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="tabular mb-1 text-[13px] font-semibold text-text-muted">
                        {fmtTime(s.start_time)}
                        {s.end_time ? ` – ${fmtTime(s.end_time)}` : ""}
                        {s.has_gv ? " · GV" : ""}
                      </div>
                      {s.film.section && (
                        <div className="mb-1">
                          <SectionBadge>{s.film.section}</SectionBadge>
                        </div>
                      )}
                      <Link href={`/s/${token}/films/${s.film.id}`} className="truncate text-[15px] font-bold">
                        {s.film.title_kor}
                      </Link>
                      {s.is_sold_out && (
                        <span className="ml-2 align-middle">
                          <SectionBadge tone="gray">매진</SectionBadge>
                        </span>
                      )}
                    </div>

                    {s.is_sold_out ? null : inSchedule ? (
                      <form action={removeFromSchedule.bind(null, token, s.id)}>
                        <button className="flex-none rounded-[9px] bg-ink-2 px-3.5 py-2.5 text-[12.5px] font-semibold text-white">
                          담김 ✓
                        </button>
                      </form>
                    ) : (
                      <form action={addToSchedule.bind(null, token, s.id)}>
                        <button className="flex-none rounded-[9px] bg-biff-red px-3.5 py-2.5 text-[12.5px] font-semibold text-white">
                          담기
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
