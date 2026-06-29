-- =============================================================
-- 32_head_partner_recursive_rls.sql
-- 총괄파트너: 하위 네트워크 전체(재귀) + master_agent_id 라인 조회
-- Supabase SQL Editor에서 실행하세요
-- =============================================================

CREATE OR REPLACE FUNCTION public.my_all_sub_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH RECURSIVE partner_tree AS (
    SELECT id
    FROM public.users
    WHERE parent_agent_id = auth.uid()
      AND role IN ('총판영업자', '하위영업자')
    UNION ALL
    SELECT u.id
    FROM public.users u
    INNER JOIN partner_tree pt ON u.parent_agent_id = pt.id
    WHERE u.role IN ('총판영업자', '하위영업자')
  )
  SELECT id FROM partner_tree
$$;

DROP POLICY IF EXISTS "총괄파트너_users_조회" ON public.users;
CREATE POLICY "총괄파트너_users_조회"
  ON public.users FOR SELECT
  USING (
    public.current_user_role() = '총괄공식파트너'
    AND (
      id = auth.uid()
      OR parent_agent_id = auth.uid()
      OR id IN (SELECT public.my_all_sub_ids())
    )
  );

DROP POLICY IF EXISTS "총괄파트너_leads_조회" ON public.leads;
CREATE POLICY "총괄파트너_leads_조회"
  ON public.leads FOR SELECT
  USING (
    public.current_user_role() = '총괄공식파트너'
    AND (
      master_agent_id = auth.uid()
      OR referred_by_user_id = auth.uid()
      OR referred_by_user_id IN (SELECT public.my_all_sub_ids())
      OR master_agent_id IN (SELECT public.my_all_sub_ids())
    )
  );

DO $$
BEGIN
  RAISE NOTICE '총괄파트너 재귀 RLS 적용 완료';
END $$;
