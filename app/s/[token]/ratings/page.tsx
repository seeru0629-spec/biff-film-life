import Link from "next/link";
import { getMyRatings } from "@/lib/queries";
import { fmtRelativeTime } from "@/lib/format";
import { SectionBadge, StarDisplay } from "@/components/ui";

export default async function MyRatingsPage({ params }: PageProps<"/s/[token]/ratings">) {
  const { token } = await params;
  const films = await getMyRatings(token);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-surface px-4 pb-3.5 pt-16">
        <div className="text-[24px] font-extrabold tracking-tight">내 별점</div>
        <div className="mt-1 text-[12.5px] text-text-faint">내가 남긴 별점·한줄평 모음이에요</div>
      </div>

      <div className="flex flex-col gap-2.5 px-4">
        {films.length === 0 && (
          <div className="rounded-[14px] border border-border bg-card p-8 text-center text-[13px] text-text-faint">
            아직 남긴 별점이 없어요. <Link href={`/s/${token}/films`} className="font-semibold text-biff-red">상영작 둘러보기</Link>
          </div>
        )}
        {films.map((film) => (
          <div key={film.id} className="relative flex gap-3 rounded-[14px] border border-border bg-card p-3">
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
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {film.section && <SectionBadge>{film.section}</SectionBadge>}
                <StarDisplay avg={film.myRating.rating} count={1} showCount={false} />
                <span className="text-[11px] text-text-faint">{fmtRelativeTime(film.myRating.created_at)}</span>
              </div>
              <div className="mb-0.5 truncate text-[15px] font-bold">{film.title_kor}</div>
              {film.myRating.review && (
                <div className="line-clamp-2 text-[12.5px] leading-relaxed text-text-muted">{film.myRating.review}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
