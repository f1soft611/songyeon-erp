-- 20261023_013_product_client_name_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 제품의 거래처를 이름이 아니라 거래처코드로 저장(2026-10-23 요청
--       "client_code 컬럼 지우고 client_name 컬럼을 _code로 바꿔줘 그리고 저장될때 거래처명이 아니라 코드가 저장되게 해주고")
-- 적용: songyeon DB 에는 사용자가 직접 같은 변경을 했다(2026-10-23). 이 스크립트는 그 변경의 기록이고,
--       다른 DB 에 같은 변경을 할 때 쓴다. 이미 바뀐 DB 에서는 아무것도 하지 않는다.
--   1) 사용자가 손으로 더했던 products.client_code(맨 끝 칸)를 지운다. 값은 거래처마스터 코드와 같았다.
--   2) products.client_name 의 거래처명을 clients.client_code(6자리)로 바꾼다.
--   3) 칸 이름을 client_code 로 바꾼다(형식 text 그대로, 자리는 예전 client_name 자리 5번째).
--   - 거래처명이 거래처마스터에 없거나 여러 곳과 맞으면 바꾸지 않고 멈춘다.
--   - 바꾸기 전 값은 bak_20261023_013_product_client 에 남긴다(이 스크립트로 바꾼 DB 만).
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'client_name') THEN

        IF EXISTS (
            SELECT 1
            FROM public.products p
            WHERE NULLIF(trim(p.client_name), '') IS NOT NULL
              AND (SELECT count(*) FROM public.clients c WHERE c.name = p.client_name AND c.client_code IS NOT NULL) <> 1
        ) THEN
            RAISE EXCEPTION 'products.client_name 중 거래처마스터와 1:1로 맞지 않는 이름이 있습니다. 먼저 정리하세요.';
        END IF;

        EXECUTE 'CREATE TABLE IF NOT EXISTS public.bak_20261023_013_product_client (
                     code text PRIMARY KEY, client_name text, client_code varchar)';

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'client_code') THEN
            EXECUTE 'INSERT INTO public.bak_20261023_013_product_client (code, client_name, client_code)
                     SELECT code, client_name, client_code FROM public.products
                     ON CONFLICT (code) DO NOTHING';
            EXECUTE 'ALTER TABLE public.products DROP COLUMN client_code';
        ELSE
            EXECUTE 'INSERT INTO public.bak_20261023_013_product_client (code, client_name, client_code)
                     SELECT code, client_name, NULL FROM public.products
                     ON CONFLICT (code) DO NOTHING';
        END IF;

        EXECUTE 'UPDATE public.products p
                 SET client_name = c.client_code
                 FROM public.clients c
                 WHERE c.name = p.client_name';
        EXECUTE 'UPDATE public.products SET client_name = NULL WHERE trim(COALESCE(client_name, '''')) = ''''';
        EXECUTE 'ALTER TABLE public.products RENAME COLUMN client_name TO client_code';
    END IF;
END $$;

COMMIT;
