import Link from "next/link";
import { createPost } from "@/app/actions";
import type { PostCategory } from "@/lib/types";

export default async function NewPostPage({ params, searchParams }: PageProps<"/s/[token]/board/new">) {
  const { token } = await params;
  const sp = await searchParams;
  const category: PostCategory = sp.category === "양도" ? "양도" : "자유";

  return (
    <div className="px-4 pt-16">
      <Link href={`/s/${token}/board?category=${category}`} className="mb-5 flex items-center gap-3.5 text-[14px] font-medium text-text-muted">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 5-7 7 7 7" />
        </svg>
        게시판
      </Link>

      <div className="mb-4.5 text-[20px] font-extrabold tracking-tight">글쓰기 · {category}</div>

      {category === "양도" && (
        <div className="mb-3.5 rounded-[12px] bg-ink-2 p-3.5 text-[12.5px] leading-relaxed text-white/85">
          연락처는 전화번호·카톡 아이디 대신 <b className="text-festival-yellow">카카오톡 오픈채팅 링크</b>로 남겨주세요. 거래 끝나면 방을 닫으면 되니 더 안전해요.
          직거래 사기에도 항상 주의해주세요.
        </div>
      )}

      <form action={createPost.bind(null, token, category)} className="flex flex-col gap-3">
        <input
          type="text"
          name="title"
          placeholder="제목"
          required
          className="rounded-[12px] border border-border-2 bg-card px-3.5 py-3 text-[15px] font-semibold outline-none placeholder:text-icon-muted placeholder:font-normal"
        />
        <textarea
          name="body"
          placeholder={category === "양도" ? "어떤 회차인지, 오픈채팅 링크를 남겨 연락받을 방법을 적어주세요" : "자유롭게 감상을 남겨보세요"}
          required
          rows={10}
          className="resize-none rounded-[12px] border border-border-2 bg-card px-3.5 py-3 text-[14px] leading-relaxed outline-none placeholder:text-icon-muted"
        />
        <button type="submit" className="rounded-xl bg-biff-red py-3.75 text-[14.5px] font-bold text-white">
          등록
        </button>
      </form>
    </div>
  );
}
