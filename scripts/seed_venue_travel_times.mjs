// 상영관 간 실제 이동시간(분) — map.kakao.com 길찾기로 15개 조합 전부 실측(2026-09-02).
// 규칙: 도보 20분 이상인 조합은 도보 대신 "자동차" 길찾기 시간으로 대체한다(사용자 방침, 2026-09-02).
//   → 지금 15개 조합은 전부 도보 20분 미만(최대 18분)이라 전부 도보 기준. 향후 상영관 추가로
//     20분 이상 나오는 조합이 생기면 도보 대신 차량 이동시간으로 다시 실측해서 넣을 것.
// venue_travel_times는 screenings/schedule_items와 무관한 참고 테이블이라 delete+insert 안전.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 분 단위, map.kakao.com 도보 길찾기 "최단거리" 기준
const PAIRS = [
  ["영화의전당 하늘연", "CGV 센텀시티", 11],
  ["영화의전당 하늘연", "롯데시네마 센텀시티", 15],
  ["영화의전당 하늘연", "영진위 표준시사실", 8],
  ["영화의전당 하늘연", "소향씨어터", 11],
  ["영화의전당 하늘연", "부산시청자미디어센터", 11],
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

const { data: venues, error: vErr } = await supabase.from("filmlife_venues").select("id, name");
if (vErr) throw vErr;
const idByName = new Map(venues.map((v) => [v.name, v.id]));

const rows = PAIRS.flatMap(([a, b, min]) => {
  const idA = idByName.get(a);
  const idB = idByName.get(b);
  if (!idA || !idB) throw new Error(`상영관을 찾을 수 없음: ${a} / ${b}`);
  return [
    { from_venue_id: idA, to_venue_id: idB, travel_min: min },
    { from_venue_id: idB, to_venue_id: idA, travel_min: min },
  ];
});

const { error: delErr } = await supabase.from("filmlife_venue_travel_times").delete().not("from_venue_id", "is", null);
if (delErr) throw delErr;
const { error: insErr } = await supabase.from("filmlife_venue_travel_times").insert(rows);
if (insErr) throw insErr;

console.log(`이동시간 매트릭스 ${rows.length}건(양방향) 반영 완료 — 상영관 ${venues.length}곳`);
