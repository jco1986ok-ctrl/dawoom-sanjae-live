#!/usr/bin/env node
/**
 * 커밋/배포 전 보드 스코프 검사
 *
 *   node scripts/check-board-scope.mjs v2          # V2 작업 커밋
 *   node scripts/check-board-scope.mjs live-promote # 라이브 승격 커밋
 *   node scripts/check-board-scope.mjs status       # 현재 변경 요약
 */

import { execSync } from "node:child_process";

const MODE = process.argv[2] ?? "status";

const V2_ALLOWED = [
  /^app\/dashboard-v2\//,
  /^lib\/v2-/,
  /^lib\/dashboard-v2-access\.ts$/,
  /^supabase\/24_/,
  /^supabase\/25_/,
  /^supabase\/26_/,
  /^supabase\/27_/,
  /^config\/dashboard-boards\.ts$/,
  /^lib\/intake-safe-defaults\.ts$/,
  /^scripts\/check-board-scope\.mjs$/,
  /^scripts\/promote-checklist\.mjs$/,
  /^\.cursor\/rules\//,
  /^package\.json$/,
  /^package-lock\.json$/,
];

const SHARED_CRITICAL = [
  /^lib\/leads-insert\.ts$/,
  /^app\/api\/leads\//,
  /^components\/DynamicForm\.tsx$/,
  /^components\/HomeClient\.tsx$/,
  /^app\/page\.tsx$/,
  /^components\/survey\//,
  /^components\/LandingPage\.tsx$/,
];

const LIVE_DIR = /^app\/dashboard\//;
const V2_DIR = /^app\/dashboard-v2\//;

function gitLines(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles() {
  const staged = gitLines("git diff --cached --name-only");
  if (staged.length > 0) return { files: staged, source: "staged" };

  const unstaged = gitLines("git diff --name-only");
  const untracked = gitLines("git ls-files --others --exclude-standard");
  const merged = [...new Set([...unstaged, ...untracked])];
  return { files: merged, source: "working tree" };
}

function matchesAny(path, patterns) {
  return patterns.some((re) => re.test(path));
}

function classify(files) {
  const live = [];
  const v2 = [];
  const shared = [];
  const other = [];

  for (const f of files) {
    if (LIVE_DIR.test(f)) live.push(f);
    else if (V2_DIR.test(f)) v2.push(f);
    else if (matchesAny(f, SHARED_CRITICAL)) shared.push(f);
    else if (matchesAny(f, V2_ALLOWED)) v2.push(f);
    else other.push(f);
  }

  return { live, v2, shared, other };
}

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

const { files, source } = changedFiles();

if (MODE === "status") {
  console.log(`\n📋 변경 파일 (${source}): ${files.length}개\n`);
  const { live, v2, shared, other } = classify(files);
  if (v2.length) console.log("V2:", v2.join("\n     "));
  if (live.length) console.log("라이브:", live.join("\n     "));
  if (shared.length) console.log("공유(접수·API):", shared.join("\n     "));
  if (other.length) console.log("기타:", other.join("\n     "));
  console.log("\n명령: npm run check:v2-scope | npm run check:live-promote\n");
  process.exit(0);
}

if (files.length === 0) {
  ok("변경 파일 없음");
  process.exit(0);
}

const { live, v2, shared, other } = classify(files);

if (MODE === "v2") {
  if (live.length > 0) {
    fail(
      `V2 커밋에 라이브 대시보드 변경이 섞여 있습니다:\n  ${live.join("\n  ")}\n\n` +
        "→ app/dashboard/** 는 빼고 커밋하거나, 라이브 승격은 promote/live-* 브랜치에서 하세요.",
    );
  }

  for (const f of shared) {
    warn(`공유 경로 변경: ${f} — 접수에 영향 가능. V2와 분리 커밋 권장.`);
  }

  const disallowed = other.filter((f) => !matchesAny(f, V2_ALLOWED));
  if (disallowed.length > 0) {
    warn(`V2 커밋에 기타 파일 포함:\n  ${disallowed.join("\n  ")}\n  의도한 변경인지 확인하세요.`);
  }

  ok(`V2 스코프 검사 통과 (${files.length}개 파일, ${source})`);
  process.exit(0);
}

if (MODE === "live-promote") {
  if (v2.length > 0 && live.length === 0) {
    fail("라이브 승격 커밋인데 app/dashboard/** 변경이 없습니다.");
  }
  if (v2.length > 0 && live.length > 0) {
    warn("V2와 라이브가 같은 커밋에 있습니다. 가능하면 승격만 별도 커밋하세요.");
  }
  ok(`라이브 승격 스코프 확인 (${files.length}개 파일)`);
  process.exit(0);
}

fail(`알 수 없는 모드: ${MODE}. v2 | live-promote | status`);
