-- 영화별 찜(기대작 하트) — 회차/링크 단위가 아니라 filmlife_films.id 단위로 건다.
-- 원본 테이블(누가 찜했는지)은 viewers/schedule_items/watch_items와 동일하게 RLS만 켜고
-- 정책 없이 잠가서 service_role(서버 액션)만 쓰게 하고, 집계(몇 명이 찜했는지)만
-- security definer 함수로 공개 노출한다.
create table if not exists public.filmlife_film_likes (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.filmlife_films(id) on delete cascade,
  viewer_token text not null references public.filmlife_viewers(token) on delete cascade,
  created_at timestamptz not null default now(),
  unique (film_id, viewer_token)
);
create index if not exists idx_filmlife_film_likes_film on public.filmlife_film_likes(film_id);
create index if not exists idx_filmlife_film_likes_viewer on public.filmlife_film_likes(viewer_token);

alter table public.filmlife_film_likes enable row level security;
-- 정책 없음 → anon/authenticated로는 조회/쓰기 불가, service_role만 가능

-- 영화별 찜 개수 집계만 공개. security definer로 테이블 소유자 권한으로 실행되어 RLS를 우회한다.
create or replace function public.filmlife_film_like_counts()
returns table (film_id uuid, like_count bigint)
language sql
security definer
set search_path = public
as $$
  select film_id, count(*) as like_count
  from public.filmlife_film_likes
  group by film_id;
$$;

grant execute on function public.filmlife_film_like_counts() to anon, authenticated;
