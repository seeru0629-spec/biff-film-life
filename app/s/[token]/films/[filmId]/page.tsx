import Link from "next/link";
import { addToSchedule, removeFromSchedule } from "@/app/actions";
import {
  getFilm,
  getFilmLikeCounts,
  getScreeningsForFilm,
  isFilmLiked,
  isScreeningInSchedule,
} from "@/lib/queries";
import { fmtDateWithWeekday, fmtTime } from "@/lib/format";
import { HeartButton, SectionBadge } from "@/components/ui";

export default async function FilmDetailPage({ params }: PageProps<"/s/[token]/films/[filmId]">) {
  const { token, filmId } = await params;
  const [film, screenings, liked, likeCounts] = await Promise.all([
    getFilm(filmId),
    getScreeningsForFilm(filmId),
    isFilmLiked(token, filmId),
    getFilmLikeCounts(),
  ]);

  const screeningStates = await Promise.all(
    screenings.map(async (s) => ({
      screening: s,
      inSchedule: await isScreeningInSchedule(token, s.id),
    }))
  );

  return (
    <div>
      <div className="bg-ink-2 px-4 pb-5.5 pt-16 text-white">
        <Link href={`/s/${token}/films`} className="mb-5 flex items-center gap-3.5 text-[14px] font-medium text-white/60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
          상영작
        </Link>
        <div className="flex gap-3.5">
          {film.still_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={film.still_image_url}
              alt={`${film.title_kor} 스틸`}
              className="h-[124px] w-[124px] flex-none rounded-[10px] bg-white/10 object-cover"
            />
          ) : (
            <div className="h-[124px] w-[124px] flex-none rounded-[10px] bg-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {film.section && <SectionBadge>{film.section}</SectionBadge>}
              {film.is_imported && <SectionBadge tone="yellow">수입작 · {film.import_distributor}</SectionBadge>}
              {film.wp_status && <SectionBadge tone="gray">{film.wp_status}</SectionBadge>}
            </div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[21px] font-extrabold tracking-tight">{film.title_kor}</span>
              <HeartButton token={token} filmId={film.id} liked={liked} count={likeCounts.get(film.id) ?? 0} size="lg" />
            </div>
            {film.title_eng && <div className="mb-2.5 text-[12.5px] text-white/55">{film.title_eng}</div>}
            <div className="text-[13px] leading-relaxed text-white/78">
              {film.director}
              <br />
              {[film.country, film.release_year, film.runtime_min ? `${film.runtime_min}분` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>
      </div>

      {film.synopsis && (
        <div className="px-4 pt-5">
          <div className="mb-2.5 text-[14px] font-bold">시놉시스</div>
          <div className="text-[14px] leading-[1.75] text-[#3F3830]" style={{ textWrap: "pretty" }}>
            {film.synopsis}
          </div>
        </div>
      )}

      <div className="px-4 pt-5.5">
        <div className="mb-2.5 flex items-baseline gap-2">
          <span className="text-[14px] font-bold">상영 회차</span>
          <span className="text-[12px] text-text-faint">{screenings.length}회차</span>
        </div>

        {screenings.length === 0 && (
          <div className="rounded-[13px] border border-border bg-card p-5 text-[13px] text-text-faint">
            상영 시간표는 9월 중 발표됩니다
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {screeningStates.map(({ screening, inSchedule }) => (
            <div key={screening.id} className="flex items-center gap-3 rounded-[13px] border border-border bg-card p-3.5">
              <div className="flex-1">
                <div className="tabular mb-1 flex items-center gap-1.5 text-[14px] font-semibold">
                  {fmtDateWithWeekday(screening.screen_date)} {fmtTime(screening.start_time)}
                  {screening.is_sold_out && <SectionBadge tone="gray">매진</SectionBadge>}
                </div>
                <div className="text-[12.5px] text-text-muted">
                  {screening.venue.name}
                  {screening.has_gv ? " · GV 있음" : ""}
                </div>
              </div>

              {screening.is_sold_out ? null : inSchedule ? (
                <form action={removeFromSchedule.bind(null, token, screening.id)}>
                  <button className="flex-none rounded-[9px] bg-ink-2 px-3.5 py-2.5 text-[12.5px] font-semibold text-white">
                    담김 ✓
                  </button>
                </form>
              ) : (
                <form action={addToSchedule.bind(null, token, screening.id)}>
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
