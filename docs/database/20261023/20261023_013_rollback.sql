-- 20261023_013_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_013 되돌리기 — client_code 를 다시 client_name(거래처명)으로 돌리고,
--       사용자가 더했던 client_code 칸(맨 끝)을 다시 만든다.
--   - 백업 표(bak_20261023_013_product_client)가 있으면 그 값으로 돌린다.
--   - 없으면(songyeon DB 는 사용자가 직접 바꿔서 백업이 없다) 거래처마스터에서 코드로 이름을 찾아 넣고,
--     맨 끝 client_code 칸에는 지금 코드를 다시 넣는다(지운 칸의 값이 거래처마스터 코드와 같았다).
--   - 거래처마스터에서 이름을 바꾼 뒤에 롤백하면 바뀐 이름이 들어간다.
-- 주의: 서버가 products.client_code 를 읽고 쓰므로, 롤백할 때는 제품 관련 쿼리도 20261023_013 이전으로 함께 돌린다.

BEGIN;

DO $$
DECLARE
    has_bak boolean := to_regclass('public.bak_20261023_013_product_client') IS NOT NULL;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'client_code')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'client_name') THEN
        EXECUTE 'COMMENT ON COLUMN public.products.client_code IS NULL';
        EXECUTE 'ALTER TABLE public.products ALTER COLUMN client_code TYPE text';
        EXECUTE 'ALTER TABLE public.products RENAME COLUMN client_code TO client_name';
        EXECUTE 'ALTER TABLE public.products ADD COLUMN client_code character varying';
        -- 맨 끝 client_code: 지금 코드(이름으로 바꾸기 전)를 넣는다
        EXECUTE 'UPDATE public.products SET client_code = client_name';
        -- client_name: 코드 → 거래처마스터 이름
        EXECUTE 'UPDATE public.products p
                 SET client_name = COALESCE((SELECT c.name FROM public.clients c WHERE c.client_code = p.client_name LIMIT 1), p.client_name)';
        IF has_bak THEN
            EXECUTE 'UPDATE public.products p SET client_name = b.client_name, client_code = b.client_code
                     FROM public.bak_20261023_013_product_client b WHERE b.code = p.code';
        END IF;
    END IF;
END $$;

DROP TABLE IF EXISTS public.bak_20261023_013_product_client;

COMMIT;
