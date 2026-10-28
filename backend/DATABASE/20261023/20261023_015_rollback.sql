-- 20261023_015_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_015 되돌리기 — client_code 를 다시 supplier(거래처 id 배열)로 돌리고 백업 표를 지운다.
--   - 백업에 있는 원재료는 백업 값 그대로 돌린다.
--   - 적용 뒤 새로 고친 원재료(백업에 없음)는 거래처코드 배열을 거래처 id 배열로 바꿔 넣는다.
-- 주의: 서버 · 화면이 materials.client_code(거래처코드 배열)를 읽고 쓰므로, 롤백할 때는 원재료 · 부자재 · 수불대장 코드도
--       20261023_015 이전으로 함께 돌린다.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'client_code')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'supplier') THEN
        EXECUTE 'COMMENT ON COLUMN public.materials.client_code IS NULL';
        EXECUTE 'ALTER TABLE public.materials RENAME COLUMN client_code TO supplier';
        EXECUTE $q$
            UPDATE public.materials m
            SET supplier = (
                SELECT '[' || string_agg(c.id::text, ',' ORDER BY e.ord) || ']'
                FROM jsonb_array_elements_text(m.supplier::jsonb) WITH ORDINALITY AS e(code, ord)
                JOIN public.clients c ON c.client_code = e.code
            )
            WHERE replace(COALESCE(m.supplier, ''), ' ', '') ~ '^\[("[0-9]+"(,"[0-9]+")*)?\]$'
        $q$;
        IF to_regclass('public.bak_20261023_015_material_supplier') IS NOT NULL THEN
            EXECUTE 'UPDATE public.materials m SET supplier = b.supplier
                     FROM public.bak_20261023_015_material_supplier b WHERE b.code = m.code';
        END IF;
    END IF;
END $$;

DROP TABLE IF EXISTS public.bak_20261023_015_material_supplier;

COMMIT;
