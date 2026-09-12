// data/biff_events.json(행사안내) + data/community_biff_events.json(커뮤니티비프)를
// filmlife_events/filmlife_event_sessions 테이블에 upsert.
// filmlife_events를 delete하면 filmlife_event_sessions가, 그 세션을 참조하는
// filmlife_schedule_items(event_session_id)도 전부 on delete cascade로 같이 지워지는데,
// event.source_url + session.booking_code 조합을 키로 삼아 "내 시간표" 담긴 항목을 백업/복구한다.
// 실행: node --env-file=.env.local scripts/seed_events.mjs
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

async function loadJson(relPath) {
  try {
    return JSON.parse(await readFile(new URL(relPath, import.meta.url)));
  } catch {
    return [];
  }
}

const biffEvents = await loadJson("../data/biff_events.json");
const communityEvents = await loadJson("../data/community_biff_events.json");
const allEvents = [...biffEvents, ...communityEvents];

function eventSourceUrl(e) {
  // 행사안내는 이벤트당 source_url이 이미 고유(카테고리 페이지#scode-코드).
  // 커뮤니티비프는 프로그램(m_idx) 단위 source_url을 그대로 쓴다.
  return e.source_url;
}

function sessionKey(eventSourceUrlValue, session) {
  return `${eventSourceUrlValue}::${session.booking_code}`;
}

console.log("장소 매칭용 filmlife_venues 조회 중...");
const { data: venues, error: venuesErr } = await supabase.from("filmlife_venues").select("id, name");
if (venuesErr) {
  console.error("venues 조회 실패:", venuesErr);
  process.exit(1);
}
const venueIdByName = new Map(venues.map((v) => [v.name, v.id]));

console.log("기존 시간표 항목(행사 세션) 백업 중...");
const { data: oldSessions, error: oldSessionsErr } = await supabase
  .from("filmlife_event_sessions")
  .select("id, booking_code, event_id, filmlife_events(source_url)");
if (oldSessionsErr) {
  console.error("기존 event_sessions 조회 실패:", oldSessionsErr);
  process.exit(1);
}
const oldSessionIdToKey = new Map(
  oldSessions
    .filter((s) => s.filmlife_events?.source_url)
    .map((s) => [s.id, sessionKey(s.filmlife_events.source_url, { booking_code: s.booking_code })])
);

const { data: oldScheduleItems, error: oldScheduleErr } = await supabase
  .from("filmlife_schedule_items")
  .select("viewer_token, event_session_id, created_at")
  .not("event_session_id", "is", null);
if (oldScheduleErr) {
  console.error("기존 schedule_items(행사) 조회 실패:", oldScheduleErr);
  process.exit(1);
}
console.log(`백업 완료: 내 시간표에 담긴 행사 세션 ${oldScheduleItems.length}건`);

console.log("기존 이벤트 데이터 삭제 중...");
const { error: delErr } = await supabase.from("filmlife_events").delete().not("id", "is", null);
if (delErr) {
  console.error("기존 이벤트 삭제 실패:", delErr);
  process.exit(1);
}

const newEventIdBySourceUrl = new Map();
{
  const rows = allEvents.map((e) => ({
    category: e.category,
    section: e.section || null,
    title: e.title,
    host: e.host || null,
    synopsis: e.synopsis || null,
    still_image_url: e.still_image_url || null,
    source_url: eventSourceUrl(e),
  }));
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data: inserted, error } = await supabase.from("filmlife_events").insert(chunk).select("id, source_url");
    if (error) {
      console.error(`이벤트 삽입 실패 (offset ${i}):`, error);
      process.exit(1);
    }
    for (const row of inserted) newEventIdBySourceUrl.set(row.source_url, row.id);
  }
}
console.log(`이벤트 시드 완료: ${allEvents.length}건`);

const newSessionIdByKey = new Map();
{
  const sessionRows = [];
  for (const e of allEvents) {
    const eventSrc = eventSourceUrl(e);
    const eventId = newEventIdBySourceUrl.get(eventSrc);
    for (const s of e.sessions || []) {
      sessionRows.push({
        event_id: eventId,
        venue_id: venueIdByName.get(s.venue_name) ?? null,
        venue_name: s.venue_name || null,
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time || null,
        booking_code: s.booking_code || null,
        source_url: s.source_url || eventSrc,
        __key: sessionKey(eventSrc, s),
      });
    }
  }
  const chunkSize = 100;
  for (let i = 0; i < sessionRows.length; i += chunkSize) {
    const chunk = sessionRows.slice(i, i + chunkSize);
    const { data: inserted, error } = await supabase
      .from("filmlife_event_sessions")
      .insert(chunk.map(({ __key, ...row }) => row))
      .select("id, event_id, booking_code");
    if (error) {
      console.error(`세션 삽입 실패 (offset ${i}):`, error);
      process.exit(1);
    }
    inserted.forEach((row, idx) => {
      newSessionIdByKey.set(chunk[idx].__key, row.id);
    });
  }
  console.log(`세션 시드 완료: ${sessionRows.length}건`);
}

let restored = 0;
let skipped = 0;
for (const item of oldScheduleItems) {
  const key = oldSessionIdToKey.get(item.event_session_id);
  const newSessionId = key && newSessionIdByKey.get(key);
  if (!newSessionId) {
    skipped++;
    continue;
  }
  const { error } = await supabase
    .from("filmlife_schedule_items")
    .insert({ viewer_token: item.viewer_token, event_session_id: newSessionId, created_at: item.created_at });
  if (error) {
    console.error("시간표 복구 실패:", error);
    continue;
  }
  restored++;
}
if (skipped > 0) console.log(`행사 시간표: ${skipped}건은 대응하는 세션이 이번 시딩에 없어 복구 스킵`);
console.log(`행사 시간표 복구 완료: ${restored}/${oldScheduleItems.length}건`);
