-- =============================================================
-- 31_partner_signup_role_guard.sql
-- 초대 링크 가입 보안: 제휴(하위영업자)만 허용 + 유입 파트너 추적
-- Supabase SQL Editor에서 실행
-- =============================================================

-- 유입(초대) 파트너 추적 — parent_agent_id 와 동일 inviter 를 명시적으로 보관
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS invited_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS invited_by_agent_code text;

COMMENT ON COLUMN public.users.invited_by_user_id IS
  '초대 링크(?invite= / ?ref=)로 가입 시 초대한 파트너 users.id';

COMMENT ON COLUMN public.users.invited_by_agent_code IS
  '가입 시 URL에 포함된 파트너 agent_id (대소문자 무시 저장 권장)';

CREATE INDEX IF NOT EXISTS idx_users_invited_by_user_id
  ON public.users (invited_by_user_id);

-- 초대 가입자(parent 지정)는 무조건 하위영업자(제휴파트너)만 허용
CREATE OR REPLACE FUNCTION public.users_enforce_invited_partner_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_agent_id IS NOT NULL OR NEW.invited_by_user_id IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM '하위영업자' THEN
      NEW.role := '하위영업자';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_enforce_invited_partner_role ON public.users;
CREATE TRIGGER trg_users_enforce_invited_partner_role
  BEFORE INSERT OR UPDATE OF role, parent_agent_id, invited_by_user_id
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_enforce_invited_partner_role();

DO $$
BEGIN
  RAISE NOTICE '초대 가입 role 가드 및 invited_by 컬럼 적용 완료';
END $$;
