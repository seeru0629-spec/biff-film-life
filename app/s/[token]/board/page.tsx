import Link from "next/link";
import { getPosts } from "@/lib/queries";
import { fmtRelativeTime } from "@/lib/format";
import { SectionBadge } from "@/components/ui";
import type { PostCategory } from "@/lib/types";

export default async function BoardPage({ params, searchParams }: PageProps<"/s/[token]/board">) {
  const { token } = await params;
  const sp = await searchParams;
  const category: PostCategory = sp.category === "양도" ? "양도" : "자유";

  const posts = await getPosts(category, token);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-surface px-4 pt-16">
        <div className="mb-3.5 text-[24px] font-extrabold tracking-tight">게시판</div>
        <div className="mb-3.5 flex gap-1.5 rounded-[11px] bg-skeleton-2 p-1">
          <Link
            href={`/s/${token}/board?category=자유`}
            className={`flex-1 rounded-lg py-2.25 text-center text-[13px] ${
              category === "자유" ? "bg-white font-semibold shadow-sm" : "font-medium text-text-muted"
            }`}
          >
            자유
          </Link>
          <Link
            href={`/s/${token}/board?category=양도`}
            className={`flex-1 rounded-lg py-2.25 text-center text-[13px] ${
              category === "양도" ? "bg-white font-semibold shadow-sm" : "font-medium text-text-muted"
            }`}
          >
            표 나눔·양도
          </Link>
        </div>
      </div>

      {category === "양도" && (
        <div className="mx-4 mb-3.5 rounded-[12px] bg-ink-2 p-3.5 text-[12px] leading-relaxed text-white/85">
          연락은 개인정보 대신 <b className="text-festival-yellow">카카오톡 오픈채팅 링크</b>로 주고받는 걸 권장해요. 직거래 사기에 항상 주의하세요.
        </div>
      )}

      <div className="flex flex-col gap-2.5 px-4">
        {posts.length === 0 && (
          <div className="rounded-[14px] border border-border bg-card p-8 text-center text-[13px] text-text-faint">
            아직 글이 없어요. 첫 글을 남겨보세요
          </div>
        )}
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/s/${token}/board/${post.id}`}
            className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-3.5"
          >
            <div className="flex items-center gap-1.5">
              <SectionBadge tone={category === "양도" ? "blue" : "gray"}>{post.category}</SectionBadge>
              {post.isMine && <SectionBadge tone="ink">내 글</SectionBadge>}
            </div>
            <div className="truncate text-[15px] font-bold">{post.title}</div>
            <div className="line-clamp-2 text-[13px] leading-relaxed text-text-muted">{post.body}</div>
            <div className="mt-1 flex items-center gap-2.5 text-[11.5px] text-text-faint">
              <span>{fmtRelativeTime(post.created_at)}</span>
              <span>·</span>
              <span>댓글 {post.commentCount}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="h-[100px]" />

      <div className="fixed inset-x-0 bottom-[82px] z-30 px-4">
        <Link
          href={`/s/${token}/board/new?category=${encodeURIComponent(category)}`}
          className="flex items-center justify-center rounded-xl bg-ink-2 py-3.75 text-[14px] font-bold text-white shadow-lg"
        >
          글쓰기
        </Link>
      </div>
    </div>
  );
}
