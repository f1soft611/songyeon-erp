-- 20261028_002_pricing_client_name_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 단가관리(단가표)의 거래처를 이름이 아니라 거래처코드로 저장(2026-10-28 요청
--       "단가관리 상세 창에 있는 거래처도 팝업으로 바꿔줘", 사용자 결정: 거래처코드로 바꾸기. 제품 20261023_013 과 같은 방식)
--   1) pricing.client_name 의 거래처명을 clients.client_code(6자리)로 바꾼다.
--   2) 빈 글자는 NULL 로 바꾼다.
--   3) 칸 이름을 client_code 로 바꾼다(형식 text 그대로, 자리 그대로).
--   - 거래처명이 거래처마스터에 없거나 여러 곳과 맞으면 바꾸지 않고 멈춘다.
--   - 바꾸기 전 값은 bak_20261028_002_pricing_client 에 남긴다.
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'pricing' AND column_name = 'client_name') THEN

        IF EXISTS (
            SELECT 1
            FROM public.pricing p
            WHERE NULLIF(trim(p.client_name), '') IS NOT NULL
              AND (SELECT count(*) FROM public.clients c WHERE c.name = p.client_name AND NULLIF(c.client_code, '') IS NOT NULL) <> 1
        ) THEN
            RAISE EXCEPTION 'pricing.client_name 중 거래처마스터와 1:1로 맞지 않는 이름이 있습니다. 먼저 정리하세요.';
        END IF;

        EXECUTE 'CREATE TABLE IF NOT EXISTS public.bak_20261028_002_pricing_client (product_code text PRIMARY KEY, client_name text)';
        EXECUTE 'INSERT INTO public.bak_20261028_002_pricing_client (product_code, client_name)
                 SELECT product_code, client_name FROM public.pricing
                 WHERE client_name IS NOT NULL
                 ON CONFLICT (product_code) DO NOTHING';

        EXECUTE 'UPDATE public.pricing p
                 SET client_name = c.client_code
                 FROM public.clients c
                 WHERE c.name = p.client_name AND NULLIF(c.client_code, '''') IS NOT NULL';
        EXECUTE 'UPDATE public.pricing SET client_name = NULL WHERE trim(COALESCE(client_name, '''')) = ''''';
        EXECUTE 'ALTER TABLE public.pricing RENAME COLUMN client_name TO client_code';
    END IF;
END $$;

COMMENT ON COLUMN public.pricing.client_code IS '거래처코드(clients.client_code, 2026-10-28. 예전 client_name = 거래처명)';

COMMIT;
