export default function V2SandboxBanner() {
  return (
    <div
      className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-violet-900"
      role="status"
    >
      <span className="font-bold">🧪 V2 샌드박스</span>
      <span className="text-violet-700/90">
        {" "}
        — 라이브 /dashboard 와 분리된 테스트 환경입니다. 신규 협업·알림 기능은 이 경로에서만 개발합니다.
      </span>
    </div>
  );
}
