// filmlife_error_log의 미해결(resolved=false) 에러를 errors/queue.json에 커밋한다.
// biff-film-life-error-fixer 클라우드 루틴은 샌드박스 아웃바운드 정책상 Supabase에
// 직접 접근하지 못해서 이 파일만 읽는다 — 이 스크립트가 그 사이를 이어주는 1단계.
// 실행: node --env-file=.env.local scripts/sync_error_queue.mjs
import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

const run = promisify(execFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

const { data, error } = await supabase
  .from("filmlife_error_log")
  .select("id, created_at, message, stack, digest, path, route_type, extra")
  .eq("resolved", false)
  .order("created_at", { ascending: true });

if (error) {
  console.error("[sync_error_queue] supabase 조회 실패:", error.message);
  process.exit(1);
}

const queue = { generated_at: new Date().toISOString(), errors: data ?? [] };
const repoRoot = new URL("..", import.meta.url).pathname;
const queuePath = `${repoRoot}errors/queue.json`;
await writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`);

const gitOpts = { cwd: repoRoot.replace(/\/$/, "") };
await run("git", ["add", "errors/queue.json"], gitOpts);

const { stdout: staged } = await run("git", ["diff", "--cached", "--name-only"], gitOpts);
if (!staged.trim()) {
  console.log("[sync_error_queue] 변경 없음 — 커밋 생략");
  process.exit(0);
}

const message = `chore: 에러 큐 동기화 (${queue.errors.length}건 미해결)`;
await run(
  "git",
  ["commit", "--author", "biff-error-sync <suzya@poledgroup.com>", "-m", message],
  gitOpts
);
await run("git", ["push", "origin", "main"], gitOpts);
console.log(`[sync_error_queue] ${message} — 푸시 완료`);
