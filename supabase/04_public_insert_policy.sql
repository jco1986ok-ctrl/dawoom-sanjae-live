-- ================================================================
-- [파일] 04_public_insert_policy.sql
-- [목적] 고객 접수 폼에서 비로그인 상태로 leads 테이블에 INSERT 허용
--
-- [실행 시점]
--   service_role 키를 이용한 API 삽입이 RLS 에러로 막힐 경우에만 실행.
--   이미 service_role 삽입이 잘 되고 있다면 이 SQL은 실행 불필요.
-- ================================================================

-- anon 역할(비로그인 방문자)이 leads에 행을 추가할 수 있도록 허용
CREATE POLICY IF NOT EXISTS "고객_공개접수_허용"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 확인: 현재 leads 테이블의 정책 목록 조회
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;
