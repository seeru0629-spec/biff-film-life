-- 왓챠피디아 스타일 별점(0.5 단위)+한줄평. 완전 익명인 게시판과 달리 여기서는
-- 닉네임(1회 설정, 그 뒤로 고정)을 붙인다 — 중복 닉네임 허용(계정 개념이 없어 굳이 막을 이유 없음).
-- viewer_token은 다른 개인 데이터와 동일하게 절대 공개 노출하지 않는다(RLS 정책 없음,
-- service_role만 접근 — 서버 컴포넌트가 읽어서 token은 제거하고 닉네임/별점/후기만 내려줌).
alter table public.filmlife_viewers add column if not exists nickname text;

create table if not exists public.filmlife_ratings (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.filmlife_films(id) on delete cascade,
  viewer_token text not null references public.filmlife_viewers(token) on delete cascade,
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5 and mod(rating * 10, 5) = 0),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (film_id, viewer_token)
);
create index if not exists idx_filmlife_ratings_film on public.filmlife_ratings(film_id);
create index if not exists idx_filmlife_ratings_viewer on public.filmlife_ratings(viewer_token);

alter table public.filmlife_ratings enable row level security;
-- 정책 없음 → anon/authenticated로는 조회/쓰기 불가, service_role(서버)만 가능.
