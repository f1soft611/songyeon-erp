-- 20261105_004_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261105_004 되돌리기 — 백업 표의 값으로 라벨 버전 · 라벨 요청의 식품유형을 처음 글자로 돌리고 백업 표를 지운다.
-- 주의: 서버 · 화면이 코드를 읽고 쓰므로, 롤백할 때는 라벨 쿼리 · 라벨등록 창 · 인쇄 창도 20261105_004 이전으로 함께 돌린다.
--       적용 뒤 새로 저장한 라벨의 식품유형(코드)은 백업에 없어 코드로 남는다.

BEGIN;

UPDATE public.product_label_versions v
SET food_type = b.food_type
FROM public.bak_20261105_004_label_food_type b
WHERE b.table_name = 'product_label_versions' AND b.row_id = v.id;

UPDATE public.label_requests r
SET food_type = b.food_type
FROM public.bak_20261105_004_label_food_type b
WHERE b.table_name = 'label_requests' AND b.row_id = r.id;

COMMENT ON COLUMN public.product_label_versions.food_type IS NULL;
COMMENT ON COLUMN public.label_requests.food_type IS NULL;

DROP TABLE IF EXISTS public.bak_20261105_004_label_food_type;

COMMIT;
