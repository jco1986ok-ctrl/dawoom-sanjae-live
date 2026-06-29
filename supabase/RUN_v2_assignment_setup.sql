-- 담당자 배정(assigned_user_id) — 25 → 26 순서로 한 번에 실행
-- Supabase SQL Editor에 전체 붙여넣기 후 Run

-- ── 25_v2_assignment.sql ─────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assignment_memo text;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON public.leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_unread
  ON public.leads(assigned_user_id)
  WHERE is_read = false;

COMMENT ON COLUMN public.leads.assigned_user_id IS 'V2 협업 — 현재 담당 직원 users.id';
COMMENT ON COLUMN public.leads.assignment_memo IS 'V2 배정 시 전달 메모';
COMMENT ON COLUMN public.leads.is_read IS 'V2 — 담당자가 배정 건을 열람했는지';

-- ── 26_v2_task_enforcement.sql (assigned_user_id 이후) ───────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS callback_date date;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.leads
SET last_updated_at = COALESCE(last_updated_at, created_at)
WHERE last_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_callback
  ON public.leads (assigned_user_id, callback_date)
  WHERE callback_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_last_updated
  ON public.leads (assigned_user_id, last_updated_at);

COMMENT ON COLUMN public.leads.callback_date IS 'V2 — 담당자 콜백 예정일';
COMMENT ON COLUMN public.leads.last_updated_at IS 'V2 — 상태·메모 등 마지막 갱신 시각';

CREATE OR REPLACE FUNCTION public.leads_touch_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.last_updated_at := COALESCE(NEW.last_updated_at, NEW.created_at, now());
    RETURN NEW;
  END IF;

  IF NEW.consultation_status IS DISTINCT FROM OLD.consultation_status
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id THEN
    NEW.last_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_touch_last_updated_at ON public.leads;
CREATE TRIGGER trg_leads_touch_last_updated_at
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.leads_touch_last_updated_at();
