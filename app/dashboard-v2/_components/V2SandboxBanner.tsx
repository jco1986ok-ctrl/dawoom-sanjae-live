import { BOARD_URLS } from "@/config/dashboard-boards";

export default function V2SandboxBanner() {
  return (
    <div
      className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900"
      role="status"
    >
      <p>
        <span className="font-bold">🧪 V2 샌드박스</span>
        <span className="text-violet-700/90">
          {" "}
          — 여기서 시연·QA 후, 승인되면{" "}
          <a
            href={BOARD_URLS.liveDashboard}
            className="font-medium underline underline-offset-2 hover:text-violet-950"
          >
            라이브 대시보드
          </a>
          로 옮깁니다. 라이브 직원 화면은 그대로 유지됩니다.
        </span>
      </p>
      <p className="mt-1.5 text-xs text-violet-600/90">
        DB는 프로덕션과 공유됩니다. status·컬럼 변경은 Supabase SQL 선행 후 테스트하세요.
      </p>
    </div>
  );
}
