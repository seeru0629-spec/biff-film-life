// 본편 상영 회차(filmlife_screenings, film_id not null, www.biff.kr 소스)의 source_url에
// 이미 박혀있는 "#code=NNN" 조각에서 예매코드를 뽑아 booking_code 컬럼에 채운다.
// UPDATE만 하는 백필 — 다른 컬럼/행은 전혀 안 건드림.
//
// 실행: node --env-file=.env.local scripts/backfill_booking_code_main.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

const { data: rows, error } = await supabase
  .from("filmlife_screenings")
  .select("id, source_url")
  .not("film_id", "is", null)
  .ilike("source_url", "%www.biff.kr%");
if (error) throw error;

let updated = 0;
let skipped = 0;
for (const row of rows) {
  const m = row.source_url?.match(/#code=(\d+)/);
  if (!m) {
    skipped++;
    continue;
  }
  const { error: uErr } = await supabase
    .from("filmlife_screenings")
    .update({ booking_code: m[1] })
    .eq("id", row.id);
  if (uErr) {
    console.error(`업데이트 실패 (${row.id}):`, uErr);
    continue;
  }
  updated++;
}
console.log(`예매코드 백필: ${updated}/${rows.length}건 (매칭 실패 ${skipped}건)`);
