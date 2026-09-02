// data/biff_films.json(본편) + data/community_biff_films.json(커뮤니티비프)를 filmlife_films 테이블에 upsert.
// 실행: node --env-file=.env.local scripts/seed_films.mjs
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

// 확정된 수입작만 표기 (progress.md 2026-09-01 기준). 찬란 6편은 아직 개별 제목 미확인 — 확인되는 대로 추가.
const GREENNARAE_IMPORTS = new Set([
  "갑자기 병세가 악화되다",
  "미노타우로스",
  "라 그라디바",
  "내가 사랑한 빌 에반스",
  "우리는 외계인",
]);

const main = JSON.parse(await readFile(new URL("../data/biff_films.json", import.meta.url)));
const community = JSON.parse(
  await readFile(new URL("../data/community_biff_films.json", import.meta.url)).catch(() => "[]")
);

function toRow(f, sourceUrlBase) {
  const isImported = GREENNARAE_IMPORTS.has(f.title_kor);
  return {
    title_kor: f.title_kor,
    title_eng: f.title_eng || null,
    director: f.director || null,
    country: f.country || null,
    section: f.section || null,
    synopsis: f.synopsis || null,
    runtime_min: f.runtime_min ?? null,
    release_year: f.release_year ?? null,
    is_imported: isImported,
    import_distributor: isImported ? "그린나래미디어" : null,
    wp_status: f.wp_status || null,
    still_image_url: f.still_image_url || null,
    source_url: `${sourceUrlBase}?idx=${f.idx}&c_idx=${f.c_idx}`,
  };
}

const rows = [
  ...main.map((f) => toRow(f, "https://www.biff.kr/kor/html/program/prog_view.asp")),
  ...community.map((f) => toRow(f, "https://community.biff.kr/kor/addon/00000001/program_view.asp")),
];

// 기존 시드 데이터 초기화 후 재삽입 (source_url로 idx 추적 가능하므로 멱등하게 재실행 가능)
const { error: delErr } = await supabase.from("filmlife_films").delete().not("id", "is", null);
if (delErr) {
  console.error("기존 데이터 삭제 실패:", delErr);
  process.exit(1);
}

const chunkSize = 100;
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  const { error } = await supabase.from("filmlife_films").insert(chunk);
  if (error) {
    console.error(`삽입 실패 (offset ${i}):`, error);
    process.exit(1);
  }
  console.log(`${i + chunk.length}/${rows.length} 삽입 완료`);
}

console.log(`시드 완료: ${rows.length}편`);
