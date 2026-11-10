-- 20261105_004_label_food_type_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 라벨 버전 · 라벨 요청의 식품유형을 공통코드 FOOD_TYPE 코드로 저장(2026-11-05 요청 "라벨에도 지금은 입력인데 콤보로 바꾸고",
--       보관방법 20261026_012 와 같은 방식: 라벨 창은 공통코드에서만 고르고 코드를 저장, 미리보기 · 인쇄에는 이름)
--   product_label_versions.food_type · label_requests.food_type 을 SONGYEON 공통코드 FOOD_TYPE 의 코드로 바꾼다.
--   - 이미 코드면 그대로, 공통코드 이름과 똑같은 글자면 그 코드.
--   - 어느 것과도 맞지 않는 글자('조미식품' 등)는 비운다(사용자 결정 2026-11-05 "지워버려").
--   - 롤백이 정확하도록 바꾸거나 비운 줄의 원래 값을 bak_20261105_004_label_food_type 에 남긴다(표 이름 · id).
-- 다시 돌려도 결과가 같다(두 번째부터는 모두 코드이거나 빈 값이라 건너뛴다).

BEGIN;

CREATE TABLE IF NOT EXISTS public.bak_20261105_004_label_food_type (
    table_name text   NOT NULL,
    row_id     bigint NOT NULL,
    food_type  text,
    PRIMARY KEY (table_name, row_id)
);

WITH ft AS (
    SELECT i.item_code
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'FOOD_TYPE'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
)
INSERT INTO public.bak_20261105_004_label_food_type (table_name, row_id, food_type)
SELECT 'product_label_versions', v.id, v.food_type
FROM public.product_label_versions v
WHERE NULLIF(TRIM(v.food_type), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ft WHERE ft.item_code = v.food_type)
UNION ALL
SELECT 'label_requests', r.id, r.food_type
FROM public.label_requests r
WHERE NULLIF(TRIM(r.food_type), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ft WHERE ft.item_code = r.food_type)
ON CONFLICT (table_name, row_id) DO NOTHING;

WITH ft AS (
    SELECT i.item_code, i.item_nm, i.sort_order
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'FOOD_TYPE'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
)
UPDATE public.product_label_versions v
SET food_type = (SELECT ft.item_code FROM ft WHERE ft.item_nm = TRIM(v.food_type) ORDER BY ft.sort_order, ft.item_code LIMIT 1)
WHERE NULLIF(TRIM(v.food_type), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ft WHERE ft.item_code = v.food_type);

WITH ft AS (
    SELECT i.item_code, i.item_nm, i.sort_order
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'FOOD_TYPE'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
)
UPDATE public.label_requests r
SET food_type = (SELECT ft.item_code FROM ft WHERE ft.item_nm = TRIM(r.food_type) ORDER BY ft.sort_order, ft.item_code LIMIT 1)
WHERE NULLIF(TRIM(r.food_type), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ft WHERE ft.item_code = r.food_type);

COMMENT ON COLUMN public.product_label_versions.food_type IS '식품유형 코드(공통코드 FOOD_TYPE, 2026-11-05)';
COMMENT ON COLUMN public.label_requests.food_type IS '식품유형 코드(공통코드 FOOD_TYPE, 2026-11-05)';

COMMIT;
