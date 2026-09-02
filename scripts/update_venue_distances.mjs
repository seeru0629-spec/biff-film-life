// 상영관 정확한 좌표 geocoding + DB 반영 (Google Geocoding API, 1회성).
// 주의: 상영관 간 "도보 이동시간"은 Google Distance Matrix API가 한국 도보 경로 데이터를
// 지원하지 않아(ZERO_RESULTS) 이 스크립트로는 계산 불가 — map.kakao.com 길찾기로 직접 실측한
// 값을 scripts/seed_venue_travel_times.mjs에 반영한다. 이 스크립트는 좌표(geocoding)만 담당.
//
// 안전 원칙: 기존 상영관(영화의전당 하늘연/롯데센텀/CGV센텀)은 이미 목업 회차와 연결돼 있어
// UPDATE만 하고 절대 delete하지 않는다(삭제 시 screenings→schedule_items/watch_items까지
// 연쇄 삭제되어 사용자 데이터가 날아감). 신규 상영관만 insert.
//
// 실행: GOOGLE_GEO_KEY=xxx node --env-file=.env.local scripts/update_venue_distances.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GEO_KEY = process.env.GOOGLE_GEO_KEY;
if (!GEO_KEY) {
  console.error("GOOGLE_GEO_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const VENUES = [
  { name: "영화의전당 하늘연", address: "부산 해운대구 수영강변대로 120 영화의전당" },
  { name: "CGV 센텀시티", address: "부산광역시 해운대구 센텀남대로 35" },
  { name: "롯데시네마 센텀시티", address: "부산광역시 해운대구 센텀남대로 59 롯데백화점" },
  { name: "영진위 표준시사실", address: "부산광역시 해운대구 수영강변대로 130" },
  { name: "소향씨어터", address: "부산 해운대구 센텀중앙로 55 소향씨어터 우리은행홀" },
  { name: "부산시청자미디어센터", address: "부산광역시 해운대구 센텀중앙로 42 부산시청자미디어센터" },
];

async function geocode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=kr&key=${GEO_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK") throw new Error(`지오코딩 실패 (${address}): ${json.status} ${json.error_message ?? ""}`);
  const { lat, lng } = json.results[0].geometry.location;
  return { lat, lng, formatted: json.results[0].formatted_address };
}

// 1. 지오코딩
const geocoded = [];
for (const v of VENUES) {
  const g = await geocode(v.address);
  geocoded.push({ ...v, ...g });
  console.log(`${v.name}: ${g.lat}, ${g.lng} (${g.formatted})`);
}

// 2. 기존 상영관은 UPDATE, 신규는 INSERT (절대 delete 안 함 — screenings/schedule_items 보호)
const { data: existingVenues, error: fetchErr } = await supabase.from("filmlife_venues").select("id, name");
if (fetchErr) throw fetchErr;
const existingByName = new Map(existingVenues.map((v) => [v.name, v.id]));

const venueIdByName = new Map();
for (const v of geocoded) {
  const existingId = existingByName.get(v.name);
  if (existingId) {
    const { error } = await supabase
      .from("filmlife_venues")
      .update({ address: v.formatted, lat: v.lat, lng: v.lng })
      .eq("id", existingId);
    if (error) throw error;
    venueIdByName.set(v.name, existingId);
    console.log(`업데이트: ${v.name}`);
  } else {
    const { data, error } = await supabase
      .from("filmlife_venues")
      .insert({ name: v.name, address: v.formatted, lat: v.lat, lng: v.lng })
      .select()
      .single();
    if (error) throw error;
    venueIdByName.set(v.name, data.id);
    console.log(`신규 추가: ${v.name}`);
  }
}

console.log(`\n좌표 반영 완료 (상영관 ${geocoded.length}곳) — 이동시간은 scripts/seed_venue_travel_times.mjs 실행 필요`);
