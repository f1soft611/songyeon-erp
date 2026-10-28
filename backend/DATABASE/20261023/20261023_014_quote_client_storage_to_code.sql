-- 20261023_014_quote_client_storage_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 견적의 거래처 · 보관방법을 코드로 저장(2026-10-23 "견적도 코드값으로 변환할게")
-- 적용: songyeon DB 에는 사용자가 직접 같은 변경을 했다(2026-10-23). 이 스크립트는 그 기록이고,
--       다른 DB 에 같은 변경을 할 때 쓴다. 이미 바뀐 DB 에서는 아무것도 하지 않는다.
--   1) quotes.client_name 의 거래처명을 clients.client_code 로 바꾸고 칸 이름을 client_code 로 바꾼다(형식 text, 자리 그대로).
--   2) quotes.storage 의 보관방법 이름을 공통코드 STORAGE_METHOD 코드로 바꾼다(이름이 같은 것만).
--   - 거래처명이 거래처마스터와 1:1로 맞지 않으면 멈춘다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'client_name') THEN
        IF EXISTS (
            SELECT 1 FROM public.quotes q
            WHERE NULLIF(trim(q.client_name), '') IS NOT NULL
              AND (SELECT count(*) FROM public.clients c WHERE c.name = q.client_name AND c.client_code IS NOT NULL) <> 1
        ) THEN
            RAISE EXCEPTION 'quotes.client_name 중 거래처마스터와 1:1로 맞지 않는 이름이 있습니다. 먼저 정리하세요.';
        END IF;
        EXECUTE 'UPDATE public.quotes q SET client_name = c.client_code FROM public.clients c WHERE c.name = q.client_name';
        EXECUTE 'UPDATE public.quotes SET client_name = NULL WHERE trim(COALESCE(client_name, '''')) = ''''';
        EXECUTE 'ALTER TABLE public.quotes RENAME COLUMN client_name TO client_code';
    END IF;
END $$;

UPDATE public.quotes q
SET storage = i.item_code
FROM public.tb_common_code_item i
JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE i.item_nm = q.storage;

COMMIT;
