// 개발 초기 화면/이동시간 경고 로직 검증용 목업 스크립트. filmlife_venues/filmlife_screenings를
// 통째로 delete하고 고정된 가짜 3개 상영관 + 5개 회차로 덮어쓴다.
// ⚠️ 2026-09-12에 실제 상영관(6곳, 실측 이동시간)·실제 상영시간표·실사용자 개인 시간표가 이미
// 쌓여있는 운영 DB에 이 스크립트를 다시 돌려서 전부 날려먹은 사고가 있었다. 실 데이터가 하나라도
// 있으면(회차에 걸린 개인 시간표든, 상영관 3곳 초과든) --force 없이는 무조건 중단한다.
// 실행: node --env-file=.env.local scripts/seed_mock_schedule.mjs [--force]
import { createClient } from "@supabase/supabase-js";
import { guardAgainstScheduleLoss } from "./lib/guard.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

const MOCK_VENUE_NAMES = ["영화의전당 하늘연", "롯데시네마 센텀시티", "CGV 센텀시티"];

async function guardAgainstRealDataOverwrite() {
  await guardAgainstScheduleLoss(supabase, {
    label: "목업 시간표 시딩 (filmlife_venues/filmlife_screenings 전체 delete)",
    countQuery: supabase
      .from("filmlife_schedule_items")
      .select("*", { count: "exact", head: true })
      .not("screening_id", "is", null),
  });

  const force = process.argv.includes("--force");
  const { data: existingVenues, error } = await supabase.from("filmlife_venues").select("name");
  if (error) throw error;
  const hasExtraVenues = existingVenues.some((v) => !MOCK_VENUE_NAMES.includes(v.name));
  if (hasExtraVenues && !force) {
    console.error(`\n🛑 중단: 현재 filmlife_venues에 목업 3곳 외의 실제 상영관이 있습니다.`);
    console.error(`   (${existingVenues.map((v) => v.name).join(", ")})`);
    console.error(`   실 데이터를 목업으로 덮어쓰는 게 맞다면 --force로 다시 실행하세요.\n`);
    process.exit(1);
  }
}

await guardAgainstRealDataOverwrite();

async function upsertVenues() {
  const venues = [
    { name: "영화의전당 하늘연", address: "부산 해운대구 수영강변대로 120", lat: 35.1698, lng: 129.1296 },
    { name: "롯데시네마 센텀시티", address: "부산 해운대구 센텀남대로 35", lat: 35.1691, lng: 129.1306 },
    { name: "CGV 센텀시티", address: "부산 해운대구 센텀남대로 35", lat: 35.1687, lng: 129.1315 },
  ];
  await supabase.from("filmlife_venues").delete().not("id", "is", null);
  const { data, error } = await supabase.from("filmlife_venues").insert(venues).select();
  if (error) throw error;
  return data;
}

async function upsertTravelTimes(venues) {
  const byName = Object.fromEntries(venues.map((v) => [v.name, v.id]));
  const pairs = [
    ["영화의전당 하늘연", "롯데시네마 센텀시티", 18],
    ["영화의전당 하늘연", "CGV 센텀시티", 25],
    ["롯데시네마 센텀시티", "CGV 센텀시티", 9],
  ];
  await supabase.from("filmlife_venue_travel_times").delete().not("from_venue_id", "is", null);
  const rows = pairs.flatMap(([a, b, min]) => [
    { from_venue_id: byName[a], to_venue_id: byName[b], travel_min: min },
    { from_venue_id: byName[b], to_venue_id: byName[a], travel_min: min },
  ]);
  const { error } = await supabase.from("filmlife_venue_travel_times").insert(rows);
  if (error) throw error;
}

async function seedScreenings(venues) {
  const byName = Object.fromEntries(venues.map((v) => [v.name, v.id]));
  const { data: films, error: filmErr } = await supabase
    .from("filmlife_films")
    .select("id, title_kor")
    .in("title_kor", ["그날의 태주", "긴긴밤", "면도"]);
  if (filmErr) throw filmErr;
  const filmId = Object.fromEntries(films.map((f) => [f.title_kor, f.id]));

  const screenings = [
    // 긴긴밤 — 10/07 10:30 하늘연, GV 있음 (담김)
    { film_id: filmId["긴긴밤"], venue_id: byName["영화의전당 하늘연"], screen_date: "2026-10-07", start_time: "10:30", end_time: "12:09", has_gv: true, is_sold_out: false },
    // 면도 — 10/07 12:29 CGV센텀 (이동시간 촉박 조합)
    { film_id: filmId["면도"], venue_id: byName["CGV 센텀시티"], screen_date: "2026-10-07", start_time: "12:29", end_time: "14:02", has_gv: false, is_sold_out: false },
    // 면도 — 10/09 19:00 CGV센텀 (다른 회차, 상세화면 예시)
    { film_id: filmId["면도"], venue_id: byName["CGV 센텀시티"], screen_date: "2026-10-09", start_time: "19:00", end_time: "20:33", has_gv: false, is_sold_out: false },
    // 그날의 태주 — 10/07 16:00 롯데센텀 (담김)
    { film_id: filmId["그날의 태주"], venue_id: byName["롯데시네마 센텀시티"], screen_date: "2026-10-07", start_time: "16:00", end_time: "18:24", has_gv: false, is_sold_out: false },
    // 그날의 태주 — 10/11 14:00 롯데센텀, 매진 (취소표 알림 데모)
    { film_id: filmId["그날의 태주"], venue_id: byName["롯데시네마 센텀시티"], screen_date: "2026-10-11", start_time: "14:00", end_time: "16:24", has_gv: false, is_sold_out: true },
  ];

  await supabase.from("filmlife_screenings").delete().not("id", "is", null);
  const { data, error } = await supabase.from("filmlife_screenings").insert(screenings).select();
  if (error) throw error;
  return data;
}

const venues = await upsertVenues();
console.log(`상영관 ${venues.length}곳 삽입`);
await upsertTravelTimes(venues);
console.log("이동시간 매트릭스 삽입 완료 (임시값 — 운영자 실측 필요)");
const screenings = await seedScreenings(venues);
console.log(`목업 회차 ${screenings.length}건 삽입`);
