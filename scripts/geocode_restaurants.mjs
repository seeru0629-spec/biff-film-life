// 맛집 후보 지오코딩 + 가장 가까운 상영관 찾기(직선거리 기준, 실제 도보시간은 이후 수작업으로 카카오맵 확인).
// 출처: 식신(siksinhot.com) 매거진 3편 — 센텀시티 맛집 베스트/점심 맛집/데이트·회식 맛집 (2026-09-02 크롤링)
// 실행: GOOGLE_GEO_KEY=xxx node scripts/geocode_restaurants.mjs
const GEO_KEY = process.env.GOOGLE_GEO_KEY;

const VENUES = [
  { name: "영화의전당 하늘연", lat: 35.1711671, lng: 129.1271917 },
  { name: "CGV 센텀시티", lat: 35.1689218, lng: 129.1296311 },
  { name: "롯데시네마 센텀시티", lat: 35.1696232, lng: 129.1312184 },
  { name: "영진위 표준시사실", lat: 35.1719868, lng: 129.1259507 },
  { name: "소향씨어터", lat: 35.1728319, lng: 129.1277306 },
  { name: "부산시청자미디어센터", lat: 35.1725641, lng: 129.1302695 },
];

const RESTAURANTS = [
  { name: "더 타코부스 신세계백화점 센텀시티점", category: "양식", address: "부산 해운대구 센텀남대로 35 신세계백화점 지하1층" },
  { name: "딤딤섬 센텀시티점", category: "중식", address: "부산 해운대구 센텀남대로 35 신세계백화점 9층" },
  { name: "히바린 신세계백화점 센텀시티점", category: "일식", address: "부산 해운대구 센텀남대로 35 신세계백화점 9층" },
  { name: "카페 레이어드 신세계센텀시티점", category: "카페", address: "부산 해운대구 센텀남대로 35 신세계백화점 지하1층" },
  { name: "남산왕돈까스 신세계센텀시티몰점", category: "일식", address: "부산 해운대구 센텀4로 15 센텀시티몰 4층" },
  { name: "스시마이우 센텀벡스코점", category: "일식", address: "부산 해운대구 센텀2로 33" },
  { name: "옥된장 부산센텀시티점", category: "한식", address: "부산 해운대구 센텀1로 17" },
  { name: "명동찌개마을 센텀점", category: "한식", address: "부산 해운대구 센텀동로 90" },
  { name: "수향 한방 닭곰탕 센텀본점", category: "한식", address: "부산 해운대구 센텀3로 26 센텀스퀘어" },
  { name: "우미남", category: "고기", address: "부산 해운대구 센텀동로 102 센텀필1" },
  { name: "상무초밥 해운대센텀점", category: "일식", address: "부산 해운대구 센텀5로 41" },
  { name: "샤브올 센텀시티점", category: "고기", address: "부산 해운대구 센텀동로 6 홈플러스 2층" },
  { name: "나담 센텀본점", category: "고기", address: "부산 해운대구 센텀5로 55" },
];

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function geocode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=kr&key=${GEO_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK") throw new Error(`실패(${address}): ${json.status}`);
  const { lat, lng } = json.results[0].geometry.location;
  return { lat, lng, formatted: json.results[0].formatted_address };
}

for (const r of RESTAURANTS) {
  const g = await geocode(r.address);
  const nearest = VENUES.map((v) => ({ v, d: haversineKm(g, v) })).sort((a, b) => a.d - b.d)[0];
  console.log(
    `${r.name}\t${r.category}\t${g.lat.toFixed(6)},${g.lng.toFixed(6)}\t가장가까운상영관=${nearest.v.name}(${(nearest.d * 1000).toFixed(0)}m 직선)\t${g.formatted}`
  );
}
