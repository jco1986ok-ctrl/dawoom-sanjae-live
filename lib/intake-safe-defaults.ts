/**
 * 환자 공개 접수 — V2 대시보드 실험과 분리된 안전 기본값
 *
 * 접수 API는 프로덕션 DB enum·컬럼과 항상 호환되어야 함.
 * V2 6단계 status는 lib/v2-lead-status.ts + 대시보드 UI에서만 사용.
 */

/** DB lead_status enum에 항상 존재하는 값 */
export const LEAD_INTAKE_DEFAULT_STATUS = "신규" as const;
