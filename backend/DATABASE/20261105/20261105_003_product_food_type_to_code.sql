-- 20261105_003_product_food_type_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 제품 식품유형을 공통코드 FOOD_TYPE 코드로 저장(2026-11-05 요청 "제품등록 화면에서 식품유형 추가해야겠다",
--       저장 방식은 사용자 결정 "코드로 저장", 보관방법 20261023_012 와 같은 방식)
--   공통코드 그룹 FOOD_TYPE(식품유형)은 사용자가 공통코드 화면에서 만들었다(001 복합조미식품 · 002 소스(살균제품) · 003 향신료조제품).
--   products.food_type 을 SONGYEON 공통코드 FOOD_TYPE 의 코드로 바꾼다.
--   - 이미 코드면 그대로, 공통코드 이름과 똑같은 글자면 그 코드.
--   - 어느 것과도 맞지 않는 글자('조미식품' 등)는 비운다(사용자 결정 2026-11-05 "지워버려").
--   - 롤백이 정확하도록 바꾸거나 비운 제품의 원래 값을 bak_20261105_003_product_food_type 에 남긴다.
--   - 라벨 표의 식품유형은 20261105_004 에서 바꾼다.
-- 다시 돌려도 결과가 같다(두 번째부터는 모두 코드이거나 빈 값이라 건너뛴다).

BEGIN;

CREATE TABLE IF NOT EXISTS public.bak_20261105_003_product_food_type (
    code      text PRIMARY KEY,
    food_type text
);

WITH ft AS (
    SELECT i.item_code, i.item_nm, i.sort_order
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'FOOD_TYPE'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
)
INSERT INTO public.bak_20261105_003_product_food_type (code, food_type)
SELECT p.code, p.food_type
FROM public.products p
WHERE NULLIF(TRIM(p.food_type), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ft WHERE ft.item_code = p.food_type)
ON CONFLICT (code) DO NOTHING;

WITH ft AS (
    SELECT i.item_code, i.item_nm, i.sort_order
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'FOOD_TYPE'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
)
UPDATE public.products p
SET food_type = (SELECT ft.item_code FROM ft WHERE ft.item_nm = TRIM(p.food_type) ORDER BY ft.sort_order, ft.item_code LIMIT 1)
WHERE NULLIF(TRIM(p.food_type), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ft WHERE ft.item_code = p.food_type);

COMMENT ON COLUMN public.products.food_type IS '식품유형 코드(공통코드 FOOD_TYPE, 2026-11-05)';

COMMIT;
