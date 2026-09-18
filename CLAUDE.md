@AGENTS.md

## ⚠️ 이 리포와 `suzy` 워크스페이스(`do-better-workspace-v2/10-projects/16-영화제-라이프/webapp`)가 독립적으로 발전 중이었음 (2026-09-18 발견)

같은 프로덕션 Supabase(`filmlife_*` 테이블, `yunseok-schedule-jarvis` 프로젝트, `filmlife_events`/
`filmlife_event_sessions` 포함 전부 공유)를 두 코드베이스가 각자 따로 건드리고 있다는 걸
2026-09-18에 발견했다. 이 리포(Mac에서 launchd로 상시 도는 자동화 파이프라인, 계정
`biff-error-sync`)가 "행사" 기능을 `filmlife_events`/`filmlife_event_sessions` 전용 테이블로
9/12부터 먼저 만들어 실사용·에러 모니터링까지 거쳤고, `suzy` 쪽은 같은 날 이걸 모른 채
`filmlife_screenings`를 확장하는 별개 방식으로 만들었다가 — 발견 후 이 리포 방식으로
통일하기로 결정(에러 이력이 더 적고 이미 실사용 검증된 쪽).

**이번에 `suzy`에서 이 리포로 포팅한 것** (2026-09-18):
- `booking_code`(biff.kr 예매 시 쓰이는 회차별 코드) — `filmlife_screenings`에도 컬럼 추가(migration
  `0009_booking_code.sql`, `filmlife_event_sessions`엔 이미 있었음) + `TimetableItem`에 포함해
  `ScheduleBlock`/`SaveImageSheet`/행사 상세 페이지에 원형 배지로 표시. 백필: `scripts/backfill_booking_code_main.mjs`
  (본편 회차의 `source_url`에 있는 `#code=NNN`에서 추출 — 이미 프로덕션에 백필 완료돼 있어 재실행 불필요, 참고용으로만 포팅).
- "내 시간표" 선택 삭제 기능 — `components/ScheduleSelection.tsx` 신규 + `ScheduleBlock`에 체크박스 연동
  + `app/actions.ts`에 `removeManyFromSchedule`/`clearSchedule` 추가 + 스케줄 페이지에 `ScheduleToolbar` 연결.

**아직 포팅 안 한 것 — 두 리포가 여전히 다른 부분** (전체 diff 기준, 2026-09-18 확인):
`layout.tsx`, `globals.css`, `proxy.ts`, `error.tsx`/`global-error.tsx`, `instrumentation.ts`/
`instrumentation-client.ts`, `lib/reportError.ts`(suzy 쪽엔 잡음 필터+급증 감지가 추가돼 있음),
`lib/supabase.ts`, `lib/festival.ts`, `lib/token.ts`, `components/ui.tsx`/`BottomNav.tsx`/
`FoodExplorer.tsx`/`InstallHintBanner.tsx`/`ShareAppButton.tsx`/`StarRatingInput.tsx`/
`TravelTimeTable.tsx`, `app/s/[token]/{food,liked,popular,ratings,board/*,films/[filmId]}/page.tsx`,
`app/api/*`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `postcss.config.mjs`,
`supabase/config.toml`, `README.md` 등 대부분. 전체 정밀 비교·병합은 아직 안 됐음 — 다음에
두 리포를 다시 맞출 때는 "행사" 통일 때처럼 어느 쪽이 더 성숙한지(에러 이력 기준)를 먼저
확인하고 결정할 것.
