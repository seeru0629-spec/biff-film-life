import Link from "next/link";
import { notFound } from "next/navigation";
import { createComment, deleteComment, deletePost } from "@/app/actions";
import { getCommentsForPost, getPost } from "@/lib/queries";
import { fmtRelativeTime } from "@/lib/format";
import { SectionBadge } from "@/components/ui";
import type { CommentWithMeta } from "@/lib/types";

function CommentRow({
  comment,
  token,
  postId,
  isReply = false,
}: {
  comment: CommentWithMeta;
  token: string;
  postId: string;
  isReply?: boolean;
}) {
  return (
    <div className={isReply ? "ml-6 border-l-2 border-hairline pl-3" : ""}>
      <div className="rounded-[12px] border border-border bg-card p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11.5px] text-text-faint">
            <span className="font-semibold text-text-muted">익명</span>
            {comment.isMine && <SectionBadge tone="ink">나</SectionBadge>}
            <span>{fmtRelativeTime(comment.created_at)}</span>
          </div>
          {comment.isMine && (
            <form action={deleteComment.bind(null, token, postId, comment.id)}>
              <button className="text-[11.5px] text-text-faint underline">삭제</button>
            </form>
          )}
        </div>
        <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{comment.body}</div>
      </div>
    </div>
  );
}

export default async function PostDetailPage({ params }: PageProps<"/s/[token]/board/[postId]">) {
  const { token, postId } = await params;
  const post = await getPost(postId, token);
  if (!post) notFound();

  const comments = await getCommentsForPost(postId, token);

  return (
    <div>
      <div className="px-4 pt-16">
        <Link href={`/s/${token}/board?category=${post.category}`} className="mb-5 flex items-center gap-3.5 text-[14px] font-medium text-text-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
          게시판
        </Link>

        <div className="mb-4.5 rounded-[14px] border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <SectionBadge tone={post.category === "양도" ? "blue" : "gray"}>{post.category}</SectionBadge>
              {post.isMine && <SectionBadge tone="ink">내 글</SectionBadge>}
            </div>
            {post.isMine && (
              <form action={deletePost.bind(null, token, postId, post.category)}>
                <button className="text-[12px] text-text-faint underline">삭제</button>
              </form>
            )}
          </div>
          <div className="mb-2 text-[18px] font-extrabold tracking-tight">{post.title}</div>
          <div className="mb-3 text-[11.5px] text-text-faint">
            익명 · {fmtRelativeTime(post.created_at)}
          </div>
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{post.body}</div>
        </div>

        <div className="mb-2.5 text-[14px] font-bold">댓글 {post.commentCount}</div>

        <div className="mb-5 flex flex-col gap-3">
          {comments.length === 0 && (
            <div className="rounded-[12px] border border-border bg-card p-5 text-center text-[13px] text-text-faint">
              첫 댓글을 남겨보세요
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <CommentRow comment={c} token={token} postId={postId} />
              {c.replies.map((r) => (
                <CommentRow key={r.id} comment={r} token={token} postId={postId} isReply />
              ))}
              <form action={createComment.bind(null, token, postId, c.id)} className="ml-6 flex gap-2">
                <input
                  type="text"
                  name="body"
                  placeholder="답글 달기"
                  required
                  className="flex-1 rounded-[10px] border border-border-2 bg-card px-3 py-2 text-[13px] outline-none placeholder:text-icon-muted"
                />
                <button className="flex-none rounded-[10px] border border-border-2 bg-card px-3 py-2 text-[12.5px] font-semibold text-text-muted">
                  등록
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[100px]" />

      <div className="fixed inset-x-0 bottom-[82px] z-30 bg-gradient-to-t from-surface via-surface/95 to-transparent px-4 pb-3.5 pt-3.5">
        <form action={createComment.bind(null, token, postId, null)} className="flex gap-2">
          <input
            type="text"
            name="body"
            placeholder="댓글을 남겨보세요"
            required
            className="flex-1 rounded-xl border border-border-2 bg-card px-3.5 py-3 text-[14px] outline-none placeholder:text-icon-muted"
          />
          <button className="flex-none rounded-xl bg-ink-2 px-4 py-3 text-[13.5px] font-bold text-white">등록</button>
        </form>
      </div>
    </div>
  );
}
