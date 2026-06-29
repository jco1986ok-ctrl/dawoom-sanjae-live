-- =============================================================
-- 30_partner_role_test_seed.sql
-- 공식·제휴 파트너 직책 테스트용 샘플 연결
--
-- · 산하 제휴파트너가 있는 공식파트너(총판영업자) 선정
-- · 고아 제휴파트너를 공식파트너 산하로 연결 (없을 때만)
-- · 소개고객(referred_by_user_id) 샘플 연결·생성
--
-- Supabase SQL Editor에서 실행 (기존 데이터 보존, 멱등)
-- =============================================================

DO $$
DECLARE
  v_official_id uuid;
  v_official_name text;
  v_affiliate_id uuid;
  v_affiliate_name text;
  v_lead_id uuid;
  v_need int;
  v_i int;
BEGIN
  SELECT u.id, u.name
  INTO v_official_id, v_official_name
  FROM public.users u
  WHERE u.role = '총판영업자' AND u.is_active
  ORDER BY
    (
      SELECT count(*)::int
      FROM public.users a
      WHERE a.role = '하위영업자' AND a.is_active AND a.parent_agent_id = u.id
    ) DESC,
    (
      SELECT count(*)::int
      FROM public.leads l
      WHERE l.referred_by_user_id IN (
        SELECT u.id
        UNION
        SELECT a.id FROM public.users a
        WHERE a.role = '하위영업자' AND a.parent_agent_id = u.id
      )
    ) DESC,
    u.created_at
  LIMIT 1;

  IF v_official_id IS NULL THEN
    RAISE NOTICE '총판영업자(공식파트너) 계정이 없습니다. 파트너 계정을 먼저 생성해 주세요.';
    RETURN;
  END IF;

  SELECT a.id, a.name
  INTO v_affiliate_id, v_affiliate_name
  FROM public.users a
  WHERE a.role = '하위영업자' AND a.is_active AND a.parent_agent_id = v_official_id
  ORDER BY (
    SELECT count(*)::int FROM public.leads l WHERE l.referred_by_user_id = a.id
  ) DESC, a.created_at
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    SELECT a.id, a.name
    INTO v_affiliate_id, v_affiliate_name
    FROM public.users a
    WHERE a.role = '하위영업자' AND a.is_active
      AND (
        a.parent_agent_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.users p
          WHERE p.id = a.parent_agent_id AND p.role = '총판영업자'
        )
      )
    ORDER BY a.created_at
    LIMIT 1;

    IF v_affiliate_id IS NOT NULL THEN
      UPDATE public.users
      SET parent_agent_id = v_official_id, updated_at = now()
      WHERE id = v_affiliate_id;
      RAISE NOTICE '제휴파트너 "%" → 공식파트너 "%" 산하로 연결', v_affiliate_name, v_official_name;
    END IF;
  END IF;

  v_need := greatest(0, 2 - (
    SELECT count(*)::int FROM public.leads l WHERE l.referred_by_user_id = v_official_id
  ));

  v_i := 0;
  WHILE v_need > 0 LOOP
    v_i := v_i + 1;

    SELECT l.id INTO v_lead_id
    FROM public.leads l
    WHERE l.referred_by_user_id IS DISTINCT FROM v_official_id
    ORDER BY
      CASE WHEN l.referred_by_user_id IS NULL THEN 0 ELSE 1 END,
      l.created_at DESC
    LIMIT 1;

    IF v_lead_id IS NULL THEN
      INSERT INTO public.leads (
        customer_name, phone, disease_name, disease_category,
        consultation_status, referral_source, referred_by_user_id, notes
      ) VALUES (
        '[테스트] 공식파트너 소개고객 ' || v_i,
        '010-8801-' || lpad(v_i::text, 4, '0'),
        '요추 디스크',
        '근골격계',
        CASE v_i WHEN 1 THEN '신규'::public.lead_status ELSE '상담중'::public.lead_status END,
        '직책테스트',
        v_official_id,
        '공식파트너 직책 테스트용 샘플'
      );
    ELSE
      UPDATE public.leads
      SET
        referred_by_user_id = v_official_id,
        referral_source = coalesce(nullif(referral_source, ''), '직책테스트'),
        updated_at = now()
      WHERE id = v_lead_id;
    END IF;

    v_need := v_need - 1;
  END LOOP;

  IF v_affiliate_id IS NOT NULL THEN
    v_need := greatest(0, 3 - (
      SELECT count(*)::int FROM public.leads l WHERE l.referred_by_user_id = v_affiliate_id
    ));

    v_i := 0;
    WHILE v_need > 0 LOOP
      v_i := v_i + 1;

      SELECT l.id INTO v_lead_id
      FROM public.leads l
      WHERE l.referred_by_user_id IS DISTINCT FROM v_affiliate_id
        AND l.referred_by_user_id IS DISTINCT FROM v_official_id
      ORDER BY
        CASE WHEN l.referred_by_user_id IS NULL THEN 0 ELSE 1 END,
        l.created_at DESC
      LIMIT 1;

      IF v_lead_id IS NULL THEN
        INSERT INTO public.leads (
          customer_name, phone, disease_name, disease_category,
          consultation_status, referral_source, referred_by_user_id, notes
        ) VALUES (
          '[테스트] 제휴파트너 소개고객 ' || v_i,
          '010-8802-' || lpad(v_i::text, 4, '0'),
          CASE v_i WHEN 1 THEN '이명·난청' WHEN 2 THEN '진폐 의심' ELSE '과로성 뇌출혈' END,
          CASE v_i WHEN 1 THEN '기타' WHEN 2 THEN '진폐/COPD' ELSE '뇌심혈관' END,
          CASE v_i
            WHEN 1 THEN '연락대기'::public.lead_status
            WHEN 2 THEN '서류준비중'::public.lead_status
            ELSE '계약완료'::public.lead_status
          END,
          '직책테스트',
          v_affiliate_id,
          '제휴파트너 직책 테스트용 샘플'
        );
      ELSE
        UPDATE public.leads
        SET
          referred_by_user_id = v_affiliate_id,
          referral_source = coalesce(nullif(referral_source, ''), '직책테스트'),
          updated_at = now()
        WHERE id = v_lead_id;
      END IF;

      v_need := v_need - 1;
    END LOOP;
  ELSE
    RAISE NOTICE '제휴파트너(하위영업자) 계정이 없어 제휴 샘플은 건너뜁니다.';
  END IF;

  RAISE NOTICE '=== 직책 테스트 시드 완료 ===';
  RAISE NOTICE '공식파트너: % (id: %)', v_official_name, v_official_id;
  IF v_affiliate_id IS NOT NULL THEN
    RAISE NOTICE '제휴파트너: % (id: %)', v_affiliate_name, v_affiliate_id;
  END IF;
END $$;

SELECT
  o.name AS 공식파트너,
  o.agent_id AS 공식코드,
  a.name AS 제휴파트너,
  a.agent_id AS 제휴코드,
  (
    SELECT count(*) FROM public.leads l
    WHERE l.referred_by_user_id = o.id
       OR l.referred_by_user_id IN (
         SELECT x.id FROM public.users x
         WHERE x.parent_agent_id = o.id AND x.role = '하위영업자'
       )
  ) AS 공식라인_소개고객수,
  (SELECT count(*) FROM public.leads l WHERE l.referred_by_user_id = a.id) AS 제휴_직접소개수
FROM public.users o
LEFT JOIN public.users a ON a.parent_agent_id = o.id AND a.role = '하위영업자' AND a.is_active
WHERE o.role = '총판영업자' AND o.is_active
ORDER BY 공식라인_소개고객수 DESC
LIMIT 5;
