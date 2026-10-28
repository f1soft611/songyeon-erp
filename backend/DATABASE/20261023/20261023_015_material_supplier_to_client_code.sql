-- 20261023_015_material_supplier_to_client_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 원재료 · 부자재 납품업체를 거래처 id 가 아니라 거래처코드로 저장(2026-10-23 요청
--       "materials 테이블에 supplier컬럼 있는데 이걸 client_code로 바꾸고 지금 id 로 저장되는걸 000001이렇게 저장되게 할 수 있나?",
--       사용자 결정: 여러 곳 유지)
--   1) materials.supplier 의 거래처 id 배열('[3,5]')을 거래처코드 배열('["000003","000005"]')로 바꾼다(순서 그대로).
--   2) 칸 이름을 client_code 로 바꾼다(형식 text, 자리 그대로).
--   - id 가 거래처마스터에 없거나 거래처코드가 비어 있으면 바꾸지 않고 멈춘다.
--   - 빈 값 · id 배열이 아닌 옛 글자는 그대로 둔다.
--   - 롤백이 정확하도록 바꾸기 전 값을 bak_20261023_015_material_supplier 에 남긴다.
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'supplier') THEN

        IF EXISTS (
            SELECT 1
            FROM public.materials m
            CROSS JOIN LATERAL jsonb_array_elements_text(replace(m.supplier, ' ', '')::jsonb) AS e(id)
            LEFT JOIN public.clients c ON c.id = e.id::int
            WHERE replace(COALESCE(m.supplier, ''), ' ', '') ~ '^\[([0-9]+(,[0-9]+)*)?\]$'
              AND (c.id IS NULL OR NULLIF(c.client_code, '') IS NULL)
        ) THEN
            RAISE EXCEPTION 'materials.supplier 에 거래처마스터에 없거나 거래처코드가 없는 id 가 있습니다. 먼저 정리하세요.';
        END IF;

        EXECUTE 'CREATE TABLE IF NOT EXISTS public.bak_20261023_015_material_supplier (code text PRIMARY KEY, supplier text)';
        EXECUTE 'INSERT INTO public.bak_20261023_015_material_supplier (code, supplier)
                 SELECT code, supplier FROM public.materials
                 WHERE NULLIF(trim(COALESCE(supplier, '''')), '''') IS NOT NULL
                 ON CONFLICT (code) DO NOTHING';

        EXECUTE $q$
            UPDATE public.materials m
            SET supplier = (
                SELECT COALESCE(jsonb_agg(to_jsonb(c.client_code::text) ORDER BY e.ord), '[]'::jsonb)::text
                FROM jsonb_array_elements_text(replace(m.supplier, ' ', '')::jsonb) WITH ORDINALITY AS e(id, ord)
                JOIN public.clients c ON c.id = e.id::int
            )
            WHERE replace(COALESCE(m.supplier, ''), ' ', '') ~ '^\[([0-9]+(,[0-9]+)*)?\]$'
        $q$;

        EXECUTE 'ALTER TABLE public.materials RENAME COLUMN supplier TO client_code';
    END IF;
END $$;

COMMENT ON COLUMN public.materials.client_code IS '납품업체 거래처코드 배열(예: ["000001","000002"], clients.client_code, 2026-10-23. 예전 supplier = 거래처 id 배열)';

COMMIT;
