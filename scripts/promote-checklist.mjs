#!/usr/bin/env node
/**
 * V2 테스트 통과 → 라이브 대시보드 승격 전 체크리스트
 *   npm run promote:checklist
 */

import { execSync } from "node:child_process";

const lines = [
  "",
  "══════════════════════════════════════════════════════════",
  "  V2 → 라이브 대시보드 승격 체크리스트",
  "══════════════════════════════════════════════════════════",
  "",
  "  □ 1. /dashboard-v2 에서 시연·QA 완료",
  "       https://pharos-sanjae.com/dashboard-v2",
  "",
  "  □ 2. 필요한 Supabase SQL을 프로덕션에 실행했는가?",
  "       (파일 경로 X — SQL Editor에 내용 붙여넣기)",
  "       · supabase/27_v2_six_stage_lead_status.sql (status enum)",
  "       · supabase/08_referrer_column.sql (referrer 컬럼, 선택)",
  "",
  "  □ 3. 접수(/api/leads/submit)는 lib/intake-safe-defaults 기준 유지",
  "       V2 status를 접수 INSERT에 넣지 않았는지 확인",
  "",
  "  □ 4. Git: promote/live-<기능명> 브랜치 생성",
  "       git checkout -b promote/live-<기능명>",
  "",
  "  □ 5. app/dashboard/** 에만 반영 (V2 컴포넌트 복사·연결)",
  "       npm run check:live-promote",
  "",
  "  □ 6. main 머지 후 /dashboard 에서 재확인",
  "       https://pharos-sanjae.com/dashboard",
  "",
  "  Cursor 지시 예시:",
  '  "테스트보드 통과. ○○ 기능을 라이브 대시보드에도 똑같이 적용해줘"',
  "",
  "══════════════════════════════════════════════════════════",
  "",
];

console.log(lines.join("\n"));

try {
  const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  console.log(`현재 브랜치: ${branch}`);
  if (branch === "main") {
    console.log("💡 승격 작업은 promote/live-* 브랜치에서 하는 것을 권장합니다.\n");
  }
} catch {
  /* ignore */
}
