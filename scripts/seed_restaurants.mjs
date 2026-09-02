// 맛집 18곳(맛집13 + 카페5) 시딩. 좌표는 scripts/geocode_restaurants.mjs 실행 결과(맛집13)와
// 웹 검색으로 찾은 주소 지오코딩(카페5, 다이닝코드 부산센텀 카페 랭킹 상위 중 프랜차이즈 제외).
// 도보시간은 아래 두 방식 혼합.
//   - "실측": map.kakao.com 길찾기 도보 결과 직접 확인 (2026-09-02)
//   - "추정": 카카오맵 자동화가 반복적으로 멈춰 실측 불가 → 같은 센텀시티 구역 내 실측된 다른 쌍들의
//     [도보 도로거리 / 직선거리] 비율(약 1.35~1.82, 강 건너는 경우만 예외적으로 2.8)을 참고해
//     직선거리로부터 환산. 사용자 승인 하에 추정치로 진행 (2026-09-02). 나중에 실측 가능하면 교체할 것.
// filmlife_restaurants는 다른 테이블의 FK 참조가 없어 delete+insert 안전.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RESTAURANTS = [
  { name: "더 타코부스 신세계백화점 센텀시티점", category: "양식", lat: 35.168922, lng: 129.129631, walk_note: "CGV 센텀시티 도보 1분(신세계백화점 지하1층)" },
  { name: "딤딤섬 센텀시티점", category: "중식", lat: 35.168922, lng: 129.129631, walk_note: "CGV 센텀시티 도보 1분(신세계백화점 9층)" },
  { name: "히바린 신세계백화점 센텀시티점", category: "일식", lat: 35.168922, lng: 129.129631, walk_note: "CGV 센텀시티 도보 1분(신세계백화점 9층)" },
  { name: "카페 레이어드 신세계센텀시티점", category: "카페", lat: 35.168922, lng: 129.129631, walk_note: "CGV 센텀시티 도보 1분(신세계백화점 지하1층)" },
  { name: "남산왕돈까스 신세계센텀시티몰점", category: "일식", lat: 35.169859, lng: 129.128260, walk_note: "CGV 센텀시티 도보 7분" },
  { name: "스시마이우 센텀벡스코점", category: "일식", lat: 35.166357, lng: 129.133427, walk_note: "롯데시네마 센텀시티 도보 9분" },
  { name: "옥된장 부산센텀시티점", category: "한식", lat: 35.166936, lng: 129.131595, walk_note: "CGV 센텀시티 도보 9분" },
  { name: "명동찌개마을 센텀점", category: "한식", lat: 35.175721, lng: 129.127260, walk_note: "소향씨어터 도보 10분" },
  { name: "수향 한방 닭곰탕 센텀본점", category: "한식", lat: 35.167132, lng: 129.133454, walk_note: "롯데시네마 센텀시티 도보 8분(추정)" },
  { name: "우미남", category: "고기", lat: 35.176160, lng: 129.126699, walk_note: "소향씨어터 도보 12분(추정)" },
  { name: "상무초밥 해운대센텀점", category: "일식", lat: 35.172231, lng: 129.130538, walk_note: "부산시청자미디어센터 도보 2분(추정)" },
  { name: "샤브올 센텀시티점", category: "고기", lat: 35.170924, lng: 129.133663, walk_note: "롯데시네마 센텀시티 도보 7분(추정)" },
  { name: "나담 센텀본점", category: "고기", lat: 35.172956, lng: 129.131588, walk_note: "부산시청자미디어센터 도보 3분(추정)" },
  // 카페 5곳 추가 (다이닝코드 부산센텀 카페 랭킹 상위 중 프랜차이즈 제외, 2026-09-02)
  { name: "카멜커피 12호점", category: "카페", lat: 35.169859, lng: 129.128260, walk_note: "CGV 센텀시티 도보 7분(신세계센텀시티몰 1층)" },
  { name: "뤼미에르 카페 신세계센텀", category: "카페", lat: 35.168922, lng: 129.129631, walk_note: "CGV 센텀시티 도보 1분(신세계백화점 1층)" },
  { name: "오설록 신세계백화점센텀시티점", category: "카페", lat: 35.168922, lng: 129.129631, walk_note: "CGV 센텀시티 도보 1분(신세계백화점)" },
  { name: "커피스미스 부산센텀시티점", category: "카페", lat: 35.173166, lng: 129.127660, walk_note: "소향씨어터 도보 1분(동서대 센텀캠퍼스 1층)" },
  { name: "커피프론트 센텀", category: "카페", lat: 35.165965, lng: 129.132375, walk_note: "CGV 센텀시티 도보 9분(추정, 벡스코 인근)" },
  // 모모스커피: BIFF 공식 파트너, 영화의전당 하늘연 앞에 축제 기간 한정 부스로 상시 운영 (사용자 확인, 2026-09-02)
  { name: "모모스커피 (BIFF 부스)", category: "카페", lat: 35.1711671, lng: 129.1271917, walk_note: "영화의전당 하늘연 바로 앞(영화제 기간 한정 부스)" },
].map((r) => ({
  ...r,
  google_map_url: `https://map.kakao.com/?q=${encodeURIComponent(r.name)}`,
}));

const { error: delErr } = await supabase.from("filmlife_restaurants").delete().not("id", "is", null);
if (delErr) throw delErr;
const { error: insErr } = await supabase.from("filmlife_restaurants").insert(RESTAURANTS);
if (insErr) throw insErr;

console.log(`맛집 ${RESTAURANTS.length}곳 반영 완료`);
