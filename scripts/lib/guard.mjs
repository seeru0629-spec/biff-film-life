// 2026-09-12 사고 재발 방지용 공용 가드.
// seed_films.mjs 재시딩 → filmlife_screenings cascade 삭제 → 그걸 참조하던
// filmlife_schedule_items(실사용자 개인 시간표)까지 통째로 날아간 사고가 있었다.
// 그 스크립트는 찜/별점은 백업·복구하면서 회차/시간표는 복구 대상에서 뺀 채로 방치돼 있었고,
// 아무 경고 없이 실제 운영 DB에 대고 실행돼버렸다.
//
// 이후로는 "삭제하면 실사용자의 개인 시간표(filmlife_schedule_items)가 사라지는" 작업 앞에
// 반드시 이 가드를 거치게 한다: 영향받는 건수를 세어 보여주고, 1건이라도 있으면
// --force 플래그 없이는 무조건 중단시킨다.
export async function guardAgainstScheduleLoss(supabase, { label, countQuery }) {
  const force = process.argv.includes("--force");
  const { count, error } = await countQuery;
  if (error) throw error;

  if (!count) {
    console.log(`가드 통과: ${label} — 영향받는 개인 시간표 항목 없음`);
    return;
  }

  if (!force) {
    console.error(`\n🛑 중단: ${label}`);
    console.error(`   이 작업을 진행하면 실사용자가 담아둔 개인 시간표 ${count}건이 cascade로 사라집니다.`);
    console.error(`   (2026-09-12에 이걸 놓쳐서 실제로 다 날린 적이 있습니다 — 반드시 확인하고 진행하세요.)`);
    console.error(`   정말 진행해야 한다면 --force 플래그를 붙여 다시 실행하세요:`);
    console.error(`     node --env-file=.env.local ${process.argv[1]} --force\n`);
    process.exit(1);
  }

  console.warn(`⚠️  --force로 진행합니다: ${label} — 개인 시간표 ${count}건이 사라집니다.`);
}
