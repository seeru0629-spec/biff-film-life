-- 게시판 댓글 알림용 웹푸시 구독 저장. viewer_token 하나에 여러 기기(엔드포인트)가 붙을 수
-- 있어 endpoint를 자연키로 삼는다(같은 기기에서 재구독하면 upsert).
create table if not exists public.filmlife_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  viewer_token text not null references public.filmlife_viewers(token) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_filmlife_push_subscriptions_viewer on public.filmlife_push_subscriptions(viewer_token);

alter table public.filmlife_push_subscriptions enable row level security;
-- 정책 없음 → anon/authenticated로는 조회/쓰기 불가, service_role(서버)만 가능
-- (filmlife_posts/comments와 동일한 이유: viewer_token 자체가 개인 링크 인증수단).
