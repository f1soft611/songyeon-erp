-- 20261023_012_product_storage_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 제품 보관방법을 공통코드 STORAGE_METHOD 코드로 저장(2026-10-23 요청 "제품등록 화면에서 보관방법을 공통코드 STORAGE_METHOD 로 적용시켜줘",
--       저장 방식은 사용자 결정 "코드로 저장")
--   products.storage 에 적힌 이름 글자를 SONGYEON 공통코드 STORAGE_METHOD 의 코드로 바꾼다.
--   - 공통코드 이름과 똑같은 글자만 바꾼다(실온(1℃~35℃) → 001, 냉장(0℃~10℃) → 002, 냉동(-18℃이하) → 003).
--   - 맞는 이름이 없는 글자 · 빈 값은 그대로 둔다.
--   - 롤백이 정확하도록 바꾸기 전 값을 bak_20261023_012_product_storage 에 남긴다.
--   - 견적(quotes) · 라벨 표의 보관방법은 바꾸지 않는다.
-- 다시 돌려도 결과가 같다(이미 코드면 이름과 맞지 않아 건너뛴다).

BEGIN;

CREATE TABLE IF NOT EXISTS public.bak_20261023_012_product_storage (
    code    text PRIMARY KEY,
    storage text
);

INSERT INTO public.bak_20261023_012_product_storage (code, storage)
SELECT p.code, p.storage
FROM public.products p
WHERE EXISTS (
    SELECT 1
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
    WHERE i.item_nm = p.storage
)
ON CONFLICT (code) DO NOTHING;

UPDATE public.products p
SET storage = (
    SELECT i.item_code
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
    WHERE i.item_nm = p.storage
    ORDER BY i.sort_order, i.item_code
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
    WHERE i.item_nm = p.storage
);

COMMENT ON COLUMN public.products.storage IS '보관방법 코드(공통코드 STORAGE_METHOD, 2026-10-23)';

COMMIT;
