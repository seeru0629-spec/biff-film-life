-- 영화가 아닌 프로그램(행사안내: 액터스하우스/마스터클래스/스페셜토크/씨네클래스/스페셜이벤트,
-- 커뮤니티비프: 리퀘스트시네마 등)을 filmlife_films에 가짜 영화 row로 욱여넣던 방식을 그만두고
-- 전용 테이블로 분리한다. 커뮤니티비프도 이번에 여기로 완전히 이전한다(별도 스크립트로 films에서 제거).

-- 행사/프로그램 (filmlife_films와 병렬 구조)
create table if not exists public.filmlife_events (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('행사안내', '커뮤니티비프')),
  section text, -- 원본 세부 프로그램명 (예: "액터스 하우스", "커뮤니티비프 - 마스터톡")
  title text not null,
  host text, -- 진행자/게스트/감독 등
  synopsis text,
  still_image_url text,
  source_url text,
  created_at timestamptz not null default now()
);

-- 행사 세션 (filmlife_screenings와 병렬 구조). 예매코드가 idx 역할을 하는 자연키.
create table if not exists public.filmlife_event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.filmlife_events(id) on delete cascade,
  venue_id uuid references public.filmlife_venues(id) on delete cascade,
  venue_name text, -- venue_id 매칭 실패해도 원문 장소명은 항상 보존
  session_date date not null,
  start_time time not null,
  end_time time,
  booking_code text,
  source_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_filmlife_event_sessions_event on public.filmlife_event_sessions(event_id);
create index if not exists idx_filmlife_event_sessions_date on public.filmlife_event_sessions(session_date);

-- 내 시간표에 영화 회차뿐 아니라 행사 세션도 같이 담을 수 있도록 확장.
-- screening_id를 nullable로 풀고 event_session_id를 추가한 뒤, 정확히 하나만 채워지도록 강제한다.
alter table public.filmlife_schedule_items alter column screening_id drop not null;
alter table public.filmlife_schedule_items add column if not exists event_session_id uuid
  references public.filmlife_event_sessions(id) on delete cascade;
alter table public.filmlife_schedule_items drop constraint if exists filmlife_schedule_items_screening_or_event_check;
alter table public.filmlife_schedule_items add constraint filmlife_schedule_items_screening_or_event_check
  check (num_nonnulls(screening_id, event_session_id) = 1);

-- 기존 unique(viewer_token, screening_id)를 부분 유니크로 교체(screening_id가 null일 수 있으므로)
alter table public.filmlife_schedule_items drop constraint if exists filmlife_schedule_items_viewer_token_screening_id_key;
drop index if exists filmlife_schedule_items_viewer_screening_uq;
drop index if exists filmlife_schedule_items_viewer_event_session_uq;
create unique index filmlife_schedule_items_viewer_screening_uq
  on public.filmlife_schedule_items(viewer_token, screening_id) where screening_id is not null;
create unique index filmlife_schedule_items_viewer_event_session_uq
  on public.filmlife_schedule_items(viewer_token, event_session_id) where event_session_id is not null;

-- RLS: filmlife_films/filmlife_screenings와 동일하게 공개 참고 데이터로 취급
alter table public.filmlife_events enable row level security;
alter table public.filmlife_event_sessions enable row level security;
drop policy if exists "public read" on public.filmlife_events;
create policy "public read" on public.filmlife_events for select using (true);
drop policy if exists "public read" on public.filmlife_event_sessions;
create policy "public read" on public.filmlife_event_sessions for select using (true);
