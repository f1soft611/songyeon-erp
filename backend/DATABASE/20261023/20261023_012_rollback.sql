-- 20261023_012_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_012 되돌리기 — 백업 표의 값으로 제품 보관방법을 처음 글자로 돌리고 백업 표를 지운다.
-- 주의: 서버 · 화면이 코드를 읽고 쓰므로, 롤백할 때는 제품등록 · 제품마스터 · 출하 · 라벨 쿼리도 20261023_012 이전으로 함께 돌린다.
--       적용 뒤 새로 등록 · 수정한 제품의 보관방법(코드)은 백업에 없어 코드로 남는다.

BEGIN;

UPDATE public.products p
SET storage = b.storage
FROM public.bak_20261023_012_product_storage b
WHERE b.code = p.code;

COMMENT ON COLUMN public.products.storage IS NULL;

DROP TABLE IF EXISTS public.bak_20261023_012_product_storage;

COMMIT;
