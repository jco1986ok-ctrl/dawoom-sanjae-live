-- =====================================================================
-- 06_attorney_system.sql
-- 사건 배당 시스템: 노무사 역할 세분화 + assigned_to 컬럼
-- =====================================================================
-- ⚠️  STEP 1: 아래 두 줄을 먼저 단독으로 실행하세요.
--     (ALTER TYPE ADD VALUE 는 단독 트랜잭션이어야 합니다)
-- =====================================================================

-- '노무사'는 기존 enum에 이미 존재합니다. 대표노무사만 추가합니다.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS '대표노무사';

-- =====================================================================
-- ⚠️  STEP 2: 위 실행 완료 후, 아래를 별도로 실행하세요.
-- =====================================================================

-- 1. leads 테이블에 담당 노무사 컬럼 추가
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- 인덱스 (일반노무사 필터용)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- 2. 노무사 RLS 정책 — 배당받은 건만 조회 가능
DROP POLICY IF EXISTS "노무사_자기_배당건만_조회" ON leads;

CREATE POLICY "노무사_자기_배당건만_조회"
  ON leads FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = '노무사'
    AND assigned_to = auth.uid()
  );

-- 3. 대표노무사 — 전체 조회
DROP POLICY IF EXISTS "대표노무사_전체_조회" ON leads;

CREATE POLICY "대표노무사_전체_조회"
  ON leads FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = '대표노무사'
  );

-- 4. 대표노무사 — assigned_to 업데이트 허용
DROP POLICY IF EXISTS "대표노무사_배당_업데이트" ON leads;

CREATE POLICY "대표노무사_배당_업데이트"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = '대표노무사'
  );

-- 5. 노무사 — 자기 배당건 상태 업데이트 허용
DROP POLICY IF EXISTS "노무사_배당건_상태_변경" ON leads;

CREATE POLICY "노무사_배당건_상태_변경"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = '노무사'
    AND assigned_to = auth.uid()
  );
