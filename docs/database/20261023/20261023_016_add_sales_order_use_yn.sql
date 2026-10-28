-- 20261023_016_add_sales_order_use_yn.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 수주등록 사용여부(2026-10-23 요청 "수주등록에 저장버튼도 있어야될거같고 동일하게 사용여부 컬럼 있어야될거같아")
--   수주 표(sales_order)에 사용여부 컬럼을 더한다.
--   - use_yn CHAR(1) NOT NULL DEFAULT 'Y', 값은 Y/N 만(포장유형 · 거래처 · 원재료의 use_yn 과 같은 정의)
--   - 있는 수주는 기본값으로 모두 Y(사용)가 된다.
--   - 사용안함 수주는 생산확정 · 출하등록의 수주 가져오기에서 빠진다(수주는 지우지 않고 사용여부로 내려놓는다).
-- 다시 돌려도 결과가 같다.

BEGIN;

ALTER TABLE public.sales_order
    ADD COLUMN IF NOT EXISTS use_yn CHAR(1) NOT NULL DEFAULT 'Y';

COMMENT ON COLUMN public.sales_order.use_yn IS '사용여부(Y 사용 / N 사용안함, 2026-10-23)';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.sales_order'::regclass
                     AND conname = 'ck_sales_order_use_yn') THEN
        ALTER TABLE public.sales_order
            ADD CONSTRAINT ck_sales_order_use_yn CHECK (use_yn IN ('Y', 'N'));
    END IF;
END $$;

COMMIT;
