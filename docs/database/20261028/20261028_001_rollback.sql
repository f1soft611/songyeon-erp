-- 20261028_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261028_001 되돌리기 — materials.client_code 를 다시 거래처코드 배열로 돌리고 백업 표를 지운다.
--   - 백업에 있는 원재료는 백업 값 그대로 돌린다(빈 배열 '[]' 포함).
--   - 적용 뒤 새로 고친 원재료(백업에 없음)는 거래처코드 한 곳을 배열('["000001"]')로 바꿔 넣는다.
-- 주의: 서버(원재료마스터 · 부자재마스터 저장)가 한 곳으로 쓰므로, 롤백할 때는 MaterialMasterServiceImpl 도
--       20261028_001 이전(supplierCodesText, 배열로 쓰기)으로 함께 돌린다. 읽는 쿼리는 두 모양을 모두 읽는다.

BEGIN;

UPDATE public.materials
SET client_code = '["' || replace(client_code, ' ', '') || '"]'
WHERE replace(COALESCE(client_code, ''), ' ', '') ~ '^[0-9]+$'
  AND (to_regclass('public.bak_20261028_001_material_client_code') IS NULL
       OR code NOT IN (SELECT code FROM public.bak_20261028_001_material_client_code));

DO $$
BEGIN
    IF to_regclass('public.bak_20261028_001_material_client_code') IS NOT NULL THEN
        EXECUTE 'UPDATE public.materials m SET client_code = b.client_code
                 FROM public.bak_20261028_001_material_client_code b WHERE b.code = m.code';
        EXECUTE 'DROP TABLE public.bak_20261028_001_material_client_code';
    END IF;
END $$;

COMMENT ON COLUMN public.materials.client_code IS '납품업체 거래처코드 배열(예: ["000001","000002"], clients.client_code, 2026-10-23. 예전 supplier = 거래처 id 배열)';

COMMIT;
