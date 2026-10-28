-- 20261028_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261028_002 되돌리기 — pricing.client_code 를 다시 client_name(거래처명)으로 돌리고 백업 표를 지운다.
--   - 백업에 있는 단가표는 백업 값 그대로 돌린다.
--   - 적용 뒤 새로 생긴 · 고친 단가표(백업에 없음)는 거래처코드를 거래처마스터 이름으로 바꿔 넣는다.
-- 주의: 서버(단가관리 조회 · 저장, 제품등록의 단가표 넣기)가 pricing.client_code 를 쓰므로, 롤백할 때는
--       EgovPricing_SQL · EgovProductRegister_SQL · PricingServiceImpl 도 20261028_002 이전으로 함께 돌린다.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'pricing' AND column_name = 'client_code')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'pricing' AND column_name = 'client_name') THEN
        EXECUTE 'COMMENT ON COLUMN public.pricing.client_code IS NULL';
        EXECUTE 'ALTER TABLE public.pricing RENAME COLUMN client_code TO client_name';
        EXECUTE 'UPDATE public.pricing p
                 SET client_name = c.name
                 FROM public.clients c
                 WHERE c.client_code = p.client_name';
        IF to_regclass('public.bak_20261028_002_pricing_client') IS NOT NULL THEN
            EXECUTE 'UPDATE public.pricing p SET client_name = b.client_name
                     FROM public.bak_20261028_002_pricing_client b WHERE b.product_code = p.product_code';
            EXECUTE 'DROP TABLE public.bak_20261028_002_pricing_client';
        END IF;
    END IF;
END $$;

COMMIT;
