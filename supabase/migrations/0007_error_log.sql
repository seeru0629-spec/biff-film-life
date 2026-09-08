-- 런타임 에러 로그. 서버(onRequestError)와 클라이언트(전역 에러 핸들러) 양쪽에서
-- /api/report-error를 거쳐 service_role로만 적재된다. 사람이 슬랙 알림으로 존재를
-- 인지하고, 주기적으로 도는 수정 에이전트가 resolved=false 행을 읽어 처리한다.
create table if not exists public.filmlife_error_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null,
  stack text,
  digest text,
  path text,
  route_type text,
  extra jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz
);
create index if not exists idx_filmlife_error_log_unresolved
  on public.filmlife_error_log(created_at) where not resolved;

alter table public.filmlife_error_log enable row level security;
-- 정책 없음 → anon/authenticated로는 조회/쓰기 불가, service_role(서버)만 가능.
