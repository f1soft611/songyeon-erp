-- 20261026_007_sales_record_codes.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 판매(sales_record)의 거래처 · 품목 · 등록자를 코드로 저장(2026-10-26 요청
--       "sales_record 테이블의 client_name,product_name,created_by 이것도 코드값으로", 사용자 결정: 마스터에 있는 것만)
--   1) client_name(거래처명) → client_code(거래처마스터 거래처코드). 같은 이름이 여럿이면 코드가 작은 것.
--   2) product_name(품명(규격)) → product_code(제품코드). '품명(규격)' · '품명 (규격)' · 품명이 맞는 제품, 여럿이면 코드가 작은 것(서버 저장 규칙과 같음).
--   3) created_by(등록자 이름) → 사번(employees.id). 칸 이름은 그대로. 같은 이름이 여럿이면 사번이 작은 것.
--   - 칸 자리 · 형식(text)은 그대로(이름만 바꾼다).
--   - 마스터 · 직원 목록에 없는 값이 있으면 바꾸지 않고 멈춘다. 빈 값은 그대로.
--   - 롤백이 정확하도록 바꾸기 전 값을 bak_20261026_007_sales_record 에 남긴다.
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'sales_record' AND column_name = 'client_name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'sales_record' AND column_name = 'client_code') THEN
            RETURN; -- 이미 바뀌었다
        END IF;
        RAISE EXCEPTION 'sales_record 모양이 예상과 다릅니다(client_name 없음). 먼저 확인하세요.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.sales_record s
               WHERE NULLIF(s.client_name, '') IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.name = s.client_name AND NULLIF(c.client_code, '') IS NOT NULL)) THEN
        RAISE EXCEPTION 'sales_record.client_name 에 거래처마스터에 없거나 거래처코드가 없는 거래처가 있습니다. 먼저 정리하세요.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.sales_record s
               WHERE NULLIF(s.product_name, '') IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM public.products p
                                 WHERE p.name = s.product_name
                                    OR (p.spec IS NOT NULL AND p.spec != ''
                                        AND (p.name || '(' || p.spec || ')' = s.product_name
                                          OR p.name || ' (' || p.spec || ')' = s.product_name)))) THEN
        RAISE EXCEPTION 'sales_record.product_name 에 제품마스터에 없는 품목이 있습니다. 먼저 정리하세요.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.sales_record s
               WHERE NULLIF(s.created_by, '') IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = s.created_by)
                 AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.name = s.created_by)) THEN
        RAISE EXCEPTION 'sales_record.created_by 에 직원 목록에 없는 이름이 있습니다. 먼저 정리하세요.';
    END IF;

    IF to_regclass('public.bak_20261026_007_sales_record') IS NULL THEN
        CREATE TABLE public.bak_20261026_007_sales_record AS
        SELECT id, client_name, product_name, created_by FROM public.sales_record;
    END IF;

    UPDATE public.sales_record s
    SET client_name = CASE WHEN NULLIF(s.client_name, '') IS NULL THEN s.client_name
                           ELSE (SELECT c.client_code FROM public.clients c
                                  WHERE c.name = s.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                                  ORDER BY c.client_code LIMIT 1) END,
        product_name = CASE WHEN NULLIF(s.product_name, '') IS NULL THEN s.product_name
                            ELSE (SELECT p.code FROM public.products p
                                   WHERE p.name = s.product_name
                                      OR (p.spec IS NOT NULL AND p.spec != ''
                                          AND (p.name || '(' || p.spec || ')' = s.product_name
                                            OR p.name || ' (' || p.spec || ')' = s.product_name))
                                   ORDER BY p.code LIMIT 1) END,
        created_by = CASE WHEN NULLIF(s.created_by, '') IS NULL THEN s.created_by
                          WHEN EXISTS (SELECT 1 FROM public.employees e WHERE e.id = s.created_by) THEN s.created_by
                          ELSE (SELECT e.id FROM public.employees e WHERE e.name = s.created_by ORDER BY e.id LIMIT 1) END;

    ALTER TABLE public.sales_record RENAME COLUMN client_name TO client_code;
    ALTER TABLE public.sales_record RENAME COLUMN product_name TO product_code;
END $$;

COMMIT;
