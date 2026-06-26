-- V2 업무 강제 · 데일리 브리핑 (callback_date, last_updated_at)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS callback_date date;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_updated_at timestamptz NOT NULL DEFAULT now();

-- 기존 행 백필
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

-- notifications: 독촉(reminder) kind 허용 (text 컬럼 — 제약 없음)
