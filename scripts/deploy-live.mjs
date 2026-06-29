#!/usr/bin/env node
/**
 * 라이브 배포 — 로컬 빌드 검증 후 GitHub main push → Vercel 자동 배포
 *
 *   npm run deploy:live
 *
 * Vercel 대시보드 Deployments 탭에서 Building → Ready 확인 (보통 1~2분)
 */

import { execSync } from "node:child_process";

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("══════════════════════════════════════════");
console.log("  라이브 배포 (GitHub → Vercel 자동 빌드)");
console.log("══════════════════════════════════════════");

const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
if (branch !== "main") {
  console.error(`\n❌ main 브랜치에서 실행해 주세요. (현재: ${branch})`);
  process.exit(1);
}

const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (status) {
  console.error("\n❌ 커밋되지 않은 변경이 있습니다. 먼저 commit 후 다시 실행하세요.");
  console.error(status.split("\n").slice(0, 10).join("\n"));
  process.exit(1);
}

const ahead = execSync("git rev-list --count origin/main..HEAD", { encoding: "utf8" }).trim();
if (ahead === "0") {
  console.log("\n⚠ push할 새 커밋이 없습니다. 이미 origin/main과 동일합니다.");
  process.exit(0);
}

run("npm run build", "프로덕션 빌드 검증");
run("git push origin main", "GitHub main push");

console.log("\n✅ push 완료 — Vercel이 자동으로 빌드합니다.");
console.log("   https://vercel.com/jco1986ok-8413s-projects/dawoom-sanjae");
console.log("   라이브: https://pharos-sanjae.com/dashboard\n");
