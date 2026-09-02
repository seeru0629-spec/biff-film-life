-- 영화제 라이프 — DB 스키마
-- 기존 yunseok-schedule-jarvis 프로젝트(public 스키마)에 얹는다.
-- PostgREST 노출 스키마 설정을 건드리면 같은 프로젝트를 쓰는 다른 앱(schedule/daily_quote 등)의
-- 설정까지 같이 밀려나갈 위험이 있어, 별도 스키마 대신 `filmlife_` 접두사로 테이블만 분리한다.
create extension if not exists "pgcrypto" with schema extensions;

-- 영화
create table if not exists public.filmlife_films (
  id uuid primary key default gen_random_uuid(),
  title_kor text not null,
  title_eng text,
  director text,
  country text,
  section text,
  synopsis text,
  runtime_min integer,
  release_year integer,
  is_imported boolean not null default false,
  import_distributor text,
  wp_status text, -- 'WP'(월드프리미어) 등 뱃지
  still_image_url text,
  source_url text,
  created_at timestamptz not null default now()
);

-- 상영관
create table if not exists public.filmlife_venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now()
);

-- 상영관 간 이동시간 매트릭스
create table if not exists public.filmlife_venue_travel_times (
  from_venue_id uuid not null references public.filmlife_venues(id) on delete cascade,
  to_venue_id uuid not null references public.filmlife_venues(id) on delete cascade,
  travel_min integer not null,
  primary key (from_venue_id, to_venue_id)
);

-- 상영 회차
create table if not exists public.filmlife_screenings (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.filmlife_films(id) on delete cascade,
  venue_id uuid not null references public.filmlife_venues(id) on delete cascade,
  screen_date date not null,
  start_time time not null,
  end_time time,
  has_gv boolean not null default false,
  is_sold_out boolean not null default false,
  source_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_filmlife_screenings_film on public.filmlife_screenings(film_id);
create index if not exists idx_filmlife_screenings_date on public.filmlife_screenings(screen_date);

-- 관람객 (개인 링크 토큰)
create table if not exists public.filmlife_viewers (
  token text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- 내 시간표 항목
create table if not exists public.filmlife_schedule_items (
  id uuid primary key default gen_random_uuid(),
  viewer_token text not null references public.filmlife_viewers(token) on delete cascade,
  screening_id uuid not null references public.filmlife_screenings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (viewer_token, screening_id)
);
create index if not exists idx_filmlife_schedule_items_viewer on public.filmlife_schedule_items(viewer_token);

-- 취소표 알림 등록
create table if not exists public.filmlife_watch_items (
  id uuid primary key default gen_random_uuid(),
  viewer_token text not null references public.filmlife_viewers(token) on delete cascade,
  screening_id uuid not null references public.filmlife_screenings(id) on delete cascade,
  push_subscription jsonb,
  status text not null default '감시중' check (status in ('감시중','알림완료','해제됨')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (viewer_token, screening_id)
);
create index if not exists idx_filmlife_watch_items_viewer on public.filmlife_watch_items(viewer_token);
create index if not exists idx_filmlife_watch_items_status on public.filmlife_watch_items(status);

-- 맛집
create table if not exists public.filmlife_restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  lat numeric not null,
  lng numeric not null,
  google_map_url text,
  walk_note text,
  created_at timestamptz not null default now()
);

-- RLS: 공개 참고 데이터는 anon 읽기 허용
alter table public.filmlife_films enable row level security;
alter table public.filmlife_venues enable row level security;
alter table public.filmlife_venue_travel_times enable row level security;
alter table public.filmlife_screenings enable row level security;
alter table public.filmlife_restaurants enable row level security;

drop policy if exists "public read" on public.filmlife_films;
create policy "public read" on public.filmlife_films for select using (true);
drop policy if exists "public read" on public.filmlife_venues;
create policy "public read" on public.filmlife_venues for select using (true);
drop policy if exists "public read" on public.filmlife_venue_travel_times;
create policy "public read" on public.filmlife_venue_travel_times for select using (true);
drop policy if exists "public read" on public.filmlife_screenings;
create policy "public read" on public.filmlife_screenings for select using (true);
drop policy if exists "public read" on public.filmlife_restaurants;
create policy "public read" on public.filmlife_restaurants for select using (true);

-- RLS: 개인 데이터(viewers/schedule_items/watch_items)는 RLS만 켜고 정책은 만들지 않음
-- → anon/authenticated 키로는 완전 접근 불가, service_role(서버 API 라우트)만 조작 가능
alter table public.filmlife_viewers enable row level security;
alter table public.filmlife_schedule_items enable row level security;
alter table public.filmlife_watch_items enable row level security;
