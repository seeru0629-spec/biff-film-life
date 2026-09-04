import Link from "next/link";
import { getLikedFilms } from "@/lib/queries";
import { HeartButton, SectionBadge } from "@/components/ui";

export default async function LikedFilmsPage({ params }: PageProps<"/s/[token]/liked">) {
  const { token } = await params;
  const films = await getLikedFilms(token);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-surface px-4 pb-3.5 pt-16">
        <div className="text-[24px] font-extrabold tracking-tight">찜한 영화</div>
        <div className="mt-1 text-[12.5px] text-text-faint">내가 하트를 누른 영화만 모아봤어요</div>
      </div>

      <div className="flex flex-col gap-2.5 px-4">
        {films.length === 0 && (
          <div className="rounded-[14px] border border-border bg-card p-8 text-center text-[13px] text-text-faint">
            아직 찜한 영화가 없어요. <Link href={`/s/${token}/films`} className="font-semibold text-biff-red">상영작 둘러보기</Link>
          </div>
        )}
        {films.map((film) => (
          <div key={film.id} className="relative flex items-center gap-3 rounded-[14px] border border-border bg-card p-3">
            <Link href={`/s/${token}/films/${film.id}`} className="absolute inset-0 z-0" aria-label={film.title_kor} />
            {film.still_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={film.still_image_url}
                alt={`${film.title_kor} 스틸`}
                className="h-[72px] w-[72px] flex-none rounded-lg bg-skeleton object-cover"
              />
            ) : (
              <div className="h-[72px] w-[72px] flex-none rounded-lg bg-skeleton" />
            )}
            <div className="min-w-0 flex-1">
              {film.section && (
                <div className="mb-1.5">
                  <SectionBadge>{film.section}</SectionBadge>
                </div>
              )}
              <div className="mb-0.5 truncate text-[15px] font-bold">{film.title_kor}</div>
              <div className="truncate text-[12.5px] text-text-muted">{[film.director, film.country].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="relative z-10 flex-none">
              <HeartButton token={token} filmId={film.id} liked count={film.likeCount} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
