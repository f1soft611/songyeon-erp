-- 20261105_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261105_003 되돌리기 — 백업 표의 값으로 제품 식품유형을 처음 글자로 돌리고 백업 표를 지운다.
-- 주의: 서버 · 화면이 코드를 읽고 쓰므로, 롤백할 때는 제품등록 · 라벨 쿼리도 20261105_003 이전으로 함께 돌린다.
--       적용 뒤 새로 등록한 제품의 식품유형(코드)은 백업에 없어 코드로 남는다.
--       공통코드 그룹 FOOD_TYPE 은 사용자가 만든 것이라 지우지 않는다.

BEGIN;

UPDATE public.products p
SET food_type = b.food_type
FROM public.bak_20261105_003_product_food_type b
WHERE b.code = p.code;

COMMENT ON COLUMN public.products.food_type IS NULL;

DROP TABLE IF EXISTS public.bak_20261105_003_product_food_type;

COMMIT;
