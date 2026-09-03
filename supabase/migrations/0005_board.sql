-- 게시판(자유/양도) — 완전 익명, 닉네임 없음. viewer_token은 글쓴이 본인 확인(수정/삭제)용일 뿐
-- 절대 공개 노출하지 않는다(토큰이 곧 개인 링크 전체 권한이라 유출되면 안 됨) — 다른 개인 데이터
-- 테이블(viewers/schedule_items)과 동일하게 RLS만 켜고 정책 없음 → service_role(서버)만 접근.
create table if not exists public.filmlife_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('자유', '양도')),
  title text not null,
  body text not null,
  viewer_token text not null references public.filmlife_viewers(token) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_filmlife_posts_category on public.filmlife_posts(category, created_at desc);

create table if not exists public.filmlife_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.filmlife_posts(id) on delete cascade,
  parent_comment_id uuid references public.filmlife_comments(id) on delete cascade,
  body text not null,
  viewer_token text not null references public.filmlife_viewers(token) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_filmlife_comments_post on public.filmlife_comments(post_id, created_at);

alter table public.filmlife_posts enable row level security;
alter table public.filmlife_comments enable row level security;
-- 정책 없음 → anon/authenticated로는 조회/쓰기 불가, service_role(서버 컴포넌트/액션)만 가능.
-- 게시판 내용 자체는 "공개"지만 viewer_token 컬럼이 곧 개인 링크 인증수단이라
-- anon 직접 조회를 열 수 없다 — 서버에서 읽어 필요한 필드만 클라이언트로 내려준다.
