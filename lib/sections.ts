/**
 * 상영작 필터(전체/작품별 상단 칩) 표시용 섹션 그룹핑.
 * DB의 원본 `section` 값(BIFF 공식 세부 프로그램명)은 그대로 두고 —
 * 개별 영화 카드의 빨간 배지는 계속 원본 기획명을 그대로 보여줌 — 필터 칩만 묶어서 간결하게 보여준다.
 * 여기 없는 section은 자기 자신이 그룹명(변경 없음).
 */
const SECTION_GROUP: Record<string, string> = {
  "한국영화의 오늘 - 스페셜 프리미어": "한국영화의 오늘",
  "한국영화의 오늘 - 파노라마": "한국영화의 오늘",
  "와이드 앵글 - 한국 단편 경쟁": "와이드 앵글",
  "와이드 앵글 - 아시아 단편 경쟁": "와이드 앵글",
  "와이드 앵글 - 다큐멘터리 경쟁": "와이드 앵글",
  "와이드 앵글 - 다큐멘터리 쇼케이스": "와이드 앵글",
  "특별기획 프로그램 - 아름다운 시절, 안성기": "특별기획 프로그램",
  "특별기획 프로그램 - 일본 애니메이션 특별전: 광기의 걸작, 전율의 기대작 12+1": "특별기획 프로그램",
  "특별기획 프로그램 - 모든 시간 모든 곳의 양자경": "특별기획 프로그램",
  "커뮤니티비프 - 리퀘스트시네마": "커뮤니티비프",
  "커뮤니티비프 - 마스터톡": "커뮤니티비프",
  "커뮤니티비프 - 취생몽사": "커뮤니티비프",
};

export function sectionGroupOf(rawSection: string): string {
  return SECTION_GROUP[rawSection] ?? rawSection;
}

const GROUP_TO_RAW: Record<string, string[]> = {};
for (const [raw, group] of Object.entries(SECTION_GROUP)) {
  (GROUP_TO_RAW[group] ??= []).push(raw);
}

/** 필터 칩에서 그룹명 클릭 시, 그 그룹에 속하는 실제 DB section 값 목록으로 역변환 (묶이지 않은 그룹은 자기 자신 그대로) */
export function rawSectionsInGroup(groupLabel: string): string[] {
  return GROUP_TO_RAW[groupLabel] ?? [groupLabel];
}
