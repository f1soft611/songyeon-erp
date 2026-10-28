-- 20261023_014_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_014 되돌리기 — 견적 거래처를 이름(client_name)으로, 보관방법을 공통코드 이름으로 돌린다.
--   - 거래처: 거래처마스터에서 코드로 이름을 찾는다(백업 표 없음. 거래처마스터에서 이름을 바꾼 뒤면 바뀐 이름이 들어간다).
--   - 보관방법: 공통코드 STORAGE_METHOD 에서 코드로 이름을 찾는다.
-- 주의: 서버 · 화면이 견적의 코드를 읽고 쓰므로, 롤백할 때는 견적 · 레시피 공유 쿼리와 화면도 20261023_014 이전으로 함께 돌린다.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'client_code')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'client_name') THEN
        EXECUTE 'ALTER TABLE public.quotes RENAME COLUMN client_code TO client_name';
        EXECUTE 'UPDATE public.quotes q
                 SET client_name = COALESCE((SELECT c.name FROM public.clients c WHERE c.client_code = q.client_name LIMIT 1), q.client_name)';
    END IF;
END $$;

UPDATE public.quotes q
SET storage = i.item_nm
FROM public.tb_common_code_item i
JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE i.item_code = q.storage;

COMMIT;
