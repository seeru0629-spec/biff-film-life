// data/biff_screenings.json(실제 상영시간표, scripts/crawl_biff_screenings.py 결과물)을
// filmlife_screenings에 반영한다. seed_mock_schedule.mjs를 대체하는 "진짜" 버전.
//
// 2026-09-12 사고 재발 방지: 이 스크립트는
//   1) filmlife_venues를 절대 전체 delete하지 않는다 — 이름으로 upsert(있으면 좌표만 갱신, 없으면 생성).
//   2) filmlife_screenings는 booking_code를 자연키로 source_url에 박아서, 삭제 전 거기 걸린
//      개인 시간표(filmlife_schedule_items)를 백업해뒀다가 새 screening_id로 remap해서 복구한다
//      (seed_films.mjs가 찜/별점에 하던 것과 같은 패턴 — 이번엔 회차/시간표에도 적용).
//   3) 그래도 혹시 몰라 scripts/lib/guard.mjs 가드도 마지막 방어선으로 같이 건다.
//
// 실행: node --env-file=.env.local scripts/seed_screenings.mjs [--force]
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { guardAgainstScheduleLoss } from "./lib/guard.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

const DETAIL_URL = "https://www.biff.kr/kor/html/program/prog_view.asp";

// 상영관 개별 스크린(예: "CGV센텀시티 3관")을 건물 단위(complex)로 묶어서 좌표/이동시간을 매긴다.
// CGV·롯데·영화의전당 좌표는 기존 scripts/seed_mock_schedule.mjs에 적힌 "실존 공개 좌표"를 그대로 쓴다.
const COMPLEXES = {
  "CGV 센텀시티": { address: "부산 해운대구 센텀남대로 35", lat: 35.1687, lng: 129.1315 },
  "롯데시네마 센텀시티": { address: "부산 해운대구 센텀남대로 35", lat: 35.1691, lng: 129.1306 },
  "영화의전당": { address: "부산 해운대구 수영강변대로 120", lat: 35.1698, lng: 129.1296 },
  // 아래 3곳은 정확한 위경도를 확보 못해 null로 둔다(주소는 실제 확인된 값) — 지도 표시엔 안 쓰이고
  // 이동시간 경고는 COMPLEX_PAIRS의 실측 분(分) 값으로만 계산되므로 기능엔 영향 없음.
  "소향씨어터": { address: "부산 해운대구 센텀중앙로 55", lat: null, lng: null },
  "영진위 표준시사실": { address: "부산 해운대구 센텀중앙로 55", lat: null, lng: null },
  "부산시청자미디어센터": { address: "부산 해운대구 센텀중앙로 42", lat: null, lng: null },
};

function complexOf(venueName) {
  if (venueName.startsWith("CGV")) return "CGV 센텀시티";
  if (venueName.startsWith("롯데시네마")) return "롯데시네마 센텀시티";
  if (venueName.startsWith("영화의전당")) return "영화의전당";
  if (venueName.startsWith("소향씨어터")) return "소향씨어터";
  if (venueName.startsWith("영화진흥위원회")) return "영진위 표준시사실";
  if (venueName.startsWith("부산시청자미디어센터")) return "부산시청자미디어센터";
  throw new Error(`알 수 없는 상영관: ${venueName} — COMPLEXES/complexOf에 추가 필요`);
}

// 건물 간 실측 이동시간(분, 2026-09-02 도보 실측 기준 — scripts/seed_venue_travel_times.mjs와 동일 출처).
// 같은 건물 안 다른 스크린 간 이동은 실측치가 없어 5분으로 잠정 처리(추후 실측 필요).
const SAME_COMPLEX_TRANSFER_MIN = 5;
const COMPLEX_PAIRS = [
  ["영화의전당", "CGV 센텀시티", 11],
  ["영화의전당", "롯데시네마 센텀시티", 15],
  ["영화의전당", "영진위 표준시사실", 8],
  ["영화의전당", "소향씨어터", 11],
  ["영화의전당", "부산시청자미디어센터", 11],
  ["CGV 센텀시티", "롯데시네마 센텀시티", 6],
  ["CGV 센텀시티", "영진위 표준시사실", 17],
  ["CGV 센텀시티", "소향씨어터", 18],
  ["CGV 센텀시티", "부산시청자미디어센터", 14],
  ["롯데시네마 센텀시티", "영진위 표준시사실", 17],
  ["롯데시네마 센텀시티", "소향씨어터", 15],
  ["롯데시네마 센텀시티", "부산시청자미디어센터", 10],
  ["영진위 표준시사실", "소향씨어터", 8],
  ["영진위 표준시사실", "부산시청자미디어센터", 10],
  ["소향씨어터", "부산시청자미디어센터", 7],
];

function travelMinBetweenComplexes(a, b) {
  if (a === b) return SAME_COMPLEX_TRANSFER_MIN;
  const hit = COMPLEX_PAIRS.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  if (!hit) throw new Error(`이동시간 데이터 없음: ${a} <-> ${b}`);
  return hit[2];
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const screeningsByFilm = JSON.parse(await readFile(new URL("../data/biff_screenings.json", import.meta.url)));

console.log("가드 확인 중...");
await guardAgainstScheduleLoss(supabase, {
  label: "실제 상영시간표 재시딩 (filmlife_screenings 전체 delete)",
  countQuery: supabase.from("filmlife_schedule_items").select("*", { count: "exact", head: true }).not("screening_id", "is", null),
});

// 1) 상영관 upsert — 절대 전체 delete 하지 않는다. 이름으로 있으면 좌표만 갱신, 없으면 새로 만든다.
console.log("상영관 upsert 중...");
const allVenueNames = new Set();
for (const f of screeningsByFilm) for (const s of f.sessions) allVenueNames.add(s.venue_name);

const { data: existingVenues, error: venuesErr } = await supabase.from("filmlife_venues").select("id, name");
if (venuesErr) throw venuesErr;
const venueIdByName = new Map(existingVenues.map((v) => [v.name, v.id]));

for (const name of allVenueNames) {
  if (venueIdByName.has(name)) continue;
  const complex = COMPLEXES[complexOf(name)] ? COMPLEXES[complexOf(name)] : null;
  const { data, error } = await supabase
    .from("filmlife_venues")
    .insert({ name, address: complex?.address ?? null, lat: complex?.lat ?? null, lng: complex?.lng ?? null })
    .select("id, name")
    .single();
  if (error) throw error;
  venueIdByName.set(name, data.id);
}
console.log(`상영관 ${allVenueNames.size}곳 확인 완료 (신규 ${allVenueNames.size - existingVenues.length > 0 ? "포함" : "없음"})`);

// 2) 이동시간 매트릭스 — 개인 시간표와 무관한 참고 테이블이라 통째로 재생성해도 안전.
console.log("이동시간 매트릭스 갱신 중...");
const venueList = Array.from(venueIdByName.entries()); // [name, id][]
const travelRows = [];
for (const [nameA, idA] of venueList) {
  for (const [nameB, idB] of venueList) {
    if (idA === idB) continue;
    const min = travelMinBetweenComplexes(complexOf(nameA), complexOf(nameB));
    travelRows.push({ from_venue_id: idA, to_venue_id: idB, travel_min: min });
  }
}
await supabase.from("filmlife_venue_travel_times").delete().not("from_venue_id", "is", null);
for (let i = 0; i < travelRows.length; i += 500) {
  const { error } = await supabase.from("filmlife_venue_travel_times").insert(travelRows.slice(i, i + 500));
  if (error) throw error;
}
console.log(`이동시간 ${travelRows.length}쌍 반영 완료`);

// 3) 회차 backup(→ 개인 시간표 remap용) → delete → reinsert → remap
console.log("기존 회차의 개인 시간표 백업 중...");
const { data: oldScreenings, error: oldScrErr } = await supabase.from("filmlife_screenings").select("id, source_url");
if (oldScrErr) throw oldScrErr;
const oldScreeningIdToSourceUrl = new Map(oldScreenings.map((s) => [s.id, s.source_url]));

const { data: oldScheduleItems, error: oldSchedErr } = await supabase
  .from("filmlife_schedule_items")
  .select("viewer_token, screening_id, created_at")
  .not("screening_id", "is", null);
if (oldSchedErr) throw oldSchedErr;
console.log(`백업 완료: 개인 시간표(영화 회차) ${oldScheduleItems.length}건`);

const { data: films, error: filmsErr } = await supabase.from("filmlife_films").select("id, source_url");
if (filmsErr) throw filmsErr;
const filmIdBySourceUrl = new Map(films.map((f) => [f.source_url, f.id]));
const { data: filmRuntimes } = await supabase.from("filmlife_films").select("id, runtime_min");
const runtimeByFilmId = new Map(filmRuntimes.map((f) => [f.id, f.runtime_min]));

const newRows = [];
let skippedNoFilm = 0;
for (const f of screeningsByFilm) {
  const filmSourceUrl = `${DETAIL_URL}?idx=${f.film_idx}&c_idx=${f.film_c_idx}`;
  const filmId = filmIdBySourceUrl.get(filmSourceUrl);
  if (!filmId) {
    skippedNoFilm += f.sessions.length;
    continue;
  }
  const runtimeMin = runtimeByFilmId.get(filmId);
  for (const s of f.sessions) {
    const venueId = venueIdByName.get(s.venue_name);
    const sourceUrl = `${filmSourceUrl}#code=${s.booking_code}`;
    newRows.push({
      film_id: filmId,
      venue_id: venueId,
      screen_date: s.screen_date,
      start_time: s.start_time,
      end_time: runtimeMin ? addMinutes(s.start_time, runtimeMin) : null,
      has_gv: s.has_gv,
      is_sold_out: false,
      source_url: sourceUrl,
    });
  }
}
if (skippedNoFilm > 0) {
  console.log(`${skippedNoFilm}건은 대응하는 filmlife_films 행을 못 찾아 스킵 (source_url 불일치)`);
}

const { error: delErr } = await supabase.from("filmlife_screenings").delete().not("id", "is", null);
if (delErr) throw delErr;

const newIdBySourceUrl = new Map();
for (let i = 0; i < newRows.length; i += 200) {
  const chunk = newRows.slice(i, i + 200);
  const { data: inserted, error } = await supabase.from("filmlife_screenings").insert(chunk).select("id, source_url");
  if (error) {
    console.error(`회차 삽입 실패 (offset ${i}):`, error);
    process.exit(1);
  }
  for (const row of inserted) newIdBySourceUrl.set(row.source_url, row.id);
}
console.log(`회차 시드 완료: ${newRows.length}건`);

let restored = 0;
let restoreSkipped = 0;
for (const item of oldScheduleItems) {
  const oldSourceUrl = oldScreeningIdToSourceUrl.get(item.screening_id);
  const newId = oldSourceUrl && newIdBySourceUrl.get(oldSourceUrl);
  if (!newId) {
    restoreSkipped++;
    continue;
  }
  const { error } = await supabase
    .from("filmlife_schedule_items")
    .insert({ viewer_token: item.viewer_token, screening_id: newId, created_at: item.created_at });
  if (error) console.error("개인 시간표 복구 실패:", error);
  else restored++;
}
if (restoreSkipped > 0) {
  console.log(`개인 시간표: ${restoreSkipped}건은 대응하는 회차가 이번 시딩에 없어 복구 스킵`);
}
console.log(`개인 시간표 복구 완료: ${restored}/${oldScheduleItems.length}건`);
