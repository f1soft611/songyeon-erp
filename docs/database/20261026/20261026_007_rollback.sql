-- 20261026_007_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_007 을 되돌린다: sales_record 의 client_code → client_name, product_code → product_name, created_by(사번) → 이름.
--   - 백업 표(bak_20261026_007_sales_record)에 있고 값이 바꾼 그대로인 줄은 백업의 예전 값으로 되돌린다.
--   - 적용 뒤 새로 넣은 줄은 거래처마스터 이름, 제품마스터 '품명(규격)'(규격이 없으면 품명), 직원 이름을 넣는다(못 찾으면 그대로).
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼 · 판매등록 서비스 · 컨트롤러)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다(client_name 이 이미 있으면 건너뛴다).

BEGIN;

DO $$
DECLARE
    has_backup boolean := to_regclass('public.bak_20261026_007_sales_record') IS NOT NULL;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'sales_record' AND column_name = 'client_name') THEN
        RETURN;
    END IF;

    IF NOT has_backup THEN
        CREATE TEMP TABLE bak_20261026_007_sales_record_empty (id integer, client_name text, product_name text, created_by text) ON COMMIT DROP;
    END IF;

    EXECUTE format($q$
        UPDATE public.sales_record s
        SET client_code = CASE WHEN NULLIF(s.client_code, '') IS NULL THEN s.client_code
                               ELSE COALESCE(
                                   (SELECT b.client_name FROM %1$s b
                                     WHERE b.id = s.id
                                       AND (SELECT c.client_code FROM public.clients c
                                             WHERE c.name = b.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                                             ORDER BY c.client_code LIMIT 1) = s.client_code),
                                   (SELECT c.name FROM public.clients c WHERE c.client_code = s.client_code LIMIT 1),
                                   s.client_code) END,
            product_code = CASE WHEN NULLIF(s.product_code, '') IS NULL THEN s.product_code
                                ELSE COALESCE(
                                    (SELECT b.product_name FROM %1$s b
                                      WHERE b.id = s.id
                                        AND (SELECT p.code FROM public.products p
                                              WHERE p.name = b.product_name
                                                 OR (p.spec IS NOT NULL AND p.spec != ''
                                                     AND (p.name || '(' || p.spec || ')' = b.product_name
                                                       OR p.name || ' (' || p.spec || ')' = b.product_name))
                                              ORDER BY p.code LIMIT 1) = s.product_code),
                                    (SELECT CASE WHEN p.spec IS NOT NULL AND p.spec != '' THEN p.name || '(' || p.spec || ')' ELSE p.name END
                                       FROM public.products p WHERE p.code = s.product_code),
                                    s.product_code) END,
            created_by = CASE WHEN NULLIF(s.created_by, '') IS NULL THEN s.created_by
                              ELSE COALESCE(
                                  (SELECT b.created_by FROM %1$s b
                                    WHERE b.id = s.id
                                      AND (b.created_by = s.created_by
                                           OR (SELECT e.id FROM public.employees e WHERE e.name = b.created_by ORDER BY e.id LIMIT 1) = s.created_by)),
                                  (SELECT e.name FROM public.employees e WHERE e.id = s.created_by LIMIT 1),
                                  s.created_by) END
    $q$, CASE WHEN has_backup THEN 'public.bak_20261026_007_sales_record' ELSE 'bak_20261026_007_sales_record_empty' END);

    ALTER TABLE public.sales_record RENAME COLUMN client_code TO client_name;
    ALTER TABLE public.sales_record RENAME COLUMN product_code TO product_name;
END $$;

COMMIT;
