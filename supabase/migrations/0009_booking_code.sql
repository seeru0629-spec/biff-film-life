-- 2026-09-18: suzy 워크스페이스에서 포팅. biff.kr 예매 시 쓰이는 회차별 코드(같은 영화라도
-- 회차마다 다름)를 본편 상영 회차에도 저장해 시간표/저장 이미지에서 확인할 수 있게 한다.
-- filmlife_event_sessions.booking_code는 이미 있으므로 filmlife_screenings만 추가.
alter table public.filmlife_screenings add column if not exists booking_code text;
