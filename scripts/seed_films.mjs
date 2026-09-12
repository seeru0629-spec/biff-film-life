// data/biff_films.json(본편)을 filmlife_films 테이블에 upsert.
// 커뮤니티비프는 filmlife_events/filmlife_event_sessions로 이전됐다 — scripts/seed_events.mjs 참고.
// films 테이블은 전체 delete+reinsert 방식이라 film_id를 참조하는 찜/별점은 cascade로 같이 지워지는데,
// source_url(=idx+c_idx)로 remap해서 자동 복구한다.
// ⚠️ filmlife_screenings(회차)는 여기서 복구 대상이 아니다 — film 삭제가 cascade로 회차까지,
// 회차 삭제가 다시 cascade로 filmlife_schedule_items(실사용자 개인 시간표)까지 날려버린다.
// 2026-09-12에 이걸 놓쳐서 실제 운영 DB의 개인 시간표를 전부 날린 사고가 있었다 — 그래서
// 진짜 회차가 하나라도 걸려있으면 --force 없이는 무조건 중단한다 (scripts/lib/guard.mjs).
// 실행: node --env-file=.env.local scripts/seed_films.mjs [--force]
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

// 확정된 수입작만 표기 (progress.md 2026-09-01 기준).
const GREENNARAE_IMPORTS = new Set([
  "갑자기 병세가 악화되다",
  "미노타우로스",
  "라 그라디바",
  "내가 사랑한 빌 에반스",
  "우리는 외계인",
]);

// 찬란 배급 6편 (2026-09-04 사용자 확인)
const CHANRAN_IMPORTS = new Set([
  "블랙 볼",
  "겁쟁이",
  "엄마의 바다",
  "클럽 키드",
  "파더랜드",
  "페이퍼 타이거",
]);

// 영화사 진진 배급 3편 (2026-09-05 사용자 확인, 진진 인스타그램 상영작 안내)
const JINJIN_IMPORTS = new Set(["옐로우 레터스", "비터 크리스마스", "실버 익스프레스"]);

// 안다미로 배급 (2026-09-05 사용자 확인, andamirofilms 인스타그램)
const ANDAMIRO_IMPORTS = new Set(["피오르"]);

// 워터홀 배급 (2026-09-05 사용자 확인, waterholecompany 인스타그램)
const WATERHOLE_IMPORTS = new Set(["마더 메리"]);

// 엣나인 배급 (2026-09-05 사용자 확인, at9film 인스타그램)
const ATNINE_IMPORTS = new Set(["zi"]);

// 시네마달 배급 3편 (2026-09-05 사용자 확인, cinemadal 인스타그램)
const CINEMADAL_IMPORTS = new Set([
  "파도 위에서 춤추는 여자",
  "어크로스: 전쟁은 어떻게 잊혀지는가",
  "안녕, 스텔라",
]);

// 미디어캐슬 배급 4편 (2026-09-05 사용자 확인, mediacastle 인스타그램, 일본 애니메이션 특별전)
const MEDIACASTLE_IMPORTS = new Set([
  "아름다운 초저녁달",
  "시라누이",
  "파리스 그린이 밝는 날에",
  "마인드 게임",
]);

// 20세기스튜디오 배급 (2026-09-05 사용자 확인, 20thcenturystudioskr 인스타그램)
const CENTURYSTUDIO_IMPORTS = new Set(["와일드 호스 나인"]);

// 넷플릭스 초청작 5편 (2026-09-05 사용자 확인, netflixkr 인스타그램 — 극장 수입배급 아닌 스트리밍 공개, 한국작 3편 포함해 전부 표기하기로 사용자 결정)
const NETFLIX_IMPORTS = new Set(["가능한 사랑", "꿀알바", "푸른길", "레이 건", "우리, 파도처럼"]);

const main = JSON.parse(await readFile(new URL("../data/biff_films.json", import.meta.url)));

function importDistributor(titleKor) {
  if (GREENNARAE_IMPORTS.has(titleKor)) return "그린나래미디어";
  if (CHANRAN_IMPORTS.has(titleKor)) return "찬란";
  if (JINJIN_IMPORTS.has(titleKor)) return "영화사 진진";
  if (ANDAMIRO_IMPORTS.has(titleKor)) return "안다미로";
  if (WATERHOLE_IMPORTS.has(titleKor)) return "워터홀";
  if (ATNINE_IMPORTS.has(titleKor)) return "엣나인";
  if (CINEMADAL_IMPORTS.has(titleKor)) return "시네마달";
  if (MEDIACASTLE_IMPORTS.has(titleKor)) return "미디어캐슬";
  if (CENTURYSTUDIO_IMPORTS.has(titleKor)) return "20세기스튜디오";
  if (NETFLIX_IMPORTS.has(titleKor)) return "넷플릭스";
  return null;
}

function toRow(f, sourceUrlBase) {
  const distributor = importDistributor(f.title_kor);
  return {
    title_kor: f.title_kor,
    title_eng: f.title_eng || null,
    director: f.director || null,
    country: f.country || null,
    section: f.section || null,
    synopsis: f.synopsis || null,
    runtime_min: f.runtime_min ?? null,
    release_year: f.release_year ?? null,
    is_imported: distributor !== null,
    import_distributor: distributor,
    wp_status: f.wp_status || null,
    still_image_url: f.still_image_url || null,
    source_url: `${sourceUrlBase}?idx=${f.idx}&c_idx=${f.c_idx}`,
  };
}

const rows = main.map((f) => toRow(f, "https://www.biff.kr/kor/html/program/prog_view.asp"));

// filmlife_films를 delete하면 film_id를 참조하는 찜/별점/회차(→시간표)가 전부 on delete cascade로
// 같이 삭제된다. source_url(=idx+c_idx, festival 고유값)을 키로 삼아 찜·별점을 백업해뒀다가
// 재삽입 후 새 id로 되살린다. 회차(filmlife_screenings)는 여기서 복구하지 않으므로, 그걸 참조하는
// 개인 시간표가 하나라도 있으면 아래 가드가 막는다.
await guardAgainstScheduleLoss(supabase, {
  label: "영화 재시딩 (filmlife_films 전체 delete → 회차 cascade 삭제)",
  countQuery: supabase
    .from("filmlife_schedule_items")
    .select("*", { count: "exact", head: true })
    .not("screening_id", "is", null),
});

console.log("기존 찜/별점 백업 중...");
const { data: oldFilms, error: oldFilmsErr } = await supabase.from("filmlife_films").select("id, source_url");
if (oldFilmsErr) {
  console.error("기존 films 조회 실패:", oldFilmsErr);
  process.exit(1);
}
const oldIdToSourceUrl = new Map(oldFilms.map((f) => [f.id, f.source_url]));

const { data: oldLikes, error: oldLikesErr } = await supabase
  .from("filmlife_film_likes")
  .select("film_id, viewer_token, created_at");
if (oldLikesErr) {
  console.error("기존 찜 조회 실패:", oldLikesErr);
  process.exit(1);
}
const { data: oldRatings, error: oldRatingsErr } = await supabase
  .from("filmlife_ratings")
  .select("film_id, viewer_token, rating, review, created_at, updated_at");
if (oldRatingsErr) {
  console.error("기존 별점 조회 실패:", oldRatingsErr);
  process.exit(1);
}
console.log(`백업 완료: 찜 ${oldLikes.length}건, 별점 ${oldRatings.length}건`);

// 기존 시드 데이터 초기화 후 재삽입 (source_url로 idx 추적 가능하므로 멱등하게 재실행 가능)
const { error: delErr } = await supabase.from("filmlife_films").delete().not("id", "is", null);
if (delErr) {
  console.error("기존 데이터 삭제 실패:", delErr);
  process.exit(1);
}

const newSourceUrlToId = new Map();
const chunkSize = 100;
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  const { data: inserted, error } = await supabase.from("filmlife_films").insert(chunk).select("id, source_url");
  if (error) {
    console.error(`삽입 실패 (offset ${i}):`, error);
    process.exit(1);
  }
  for (const row of inserted) newSourceUrlToId.set(row.source_url, row.id);
  console.log(`${i + chunk.length}/${rows.length} 삽입 완료`);
}

console.log(`시드 완료: ${rows.length}편`);

// 찜/별점을 새 film_id로 remap해서 복구 (같은 영화가 이번에도 있을 때만 — idx/c_idx가 없어졌으면 스킵)
function remap(oldRows, label) {
  const remapped = [];
  let skipped = 0;
  for (const row of oldRows) {
    const sourceUrl = oldIdToSourceUrl.get(row.film_id);
    const newId = sourceUrl && newSourceUrlToId.get(sourceUrl);
    if (!newId) {
      skipped++;
      continue;
    }
    remapped.push({ ...row, film_id: newId });
  }
  if (skipped > 0) console.log(`${label}: ${skipped}건은 대응하는 영화가 이번 시딩에 없어 복구 스킵`);
  return remapped;
}

const remappedLikes = remap(oldLikes, "찜");
if (remappedLikes.length > 0) {
  const { error } = await supabase.from("filmlife_film_likes").insert(remappedLikes);
  if (error) {
    console.error("찜 복구 실패:", error);
    process.exit(1);
  }
}
console.log(`찜 복구 완료: ${remappedLikes.length}/${oldLikes.length}건`);

const remappedRatings = remap(oldRatings, "별점");
if (remappedRatings.length > 0) {
  const { error } = await supabase.from("filmlife_ratings").insert(remappedRatings);
  if (error) {
    console.error("별점 복구 실패:", error);
    process.exit(1);
  }
}
console.log(`별점 복구 완료: ${remappedRatings.length}/${oldRatings.length}건`);
