-- 20261026_003_sales_order_client_product_code.sql
-- 대상 DB: songyeon (PostgreSQL 18)
-- 목적: 수주(sales_order)를 생산확정(20261026_001 · 002)과 같은 모양으로(2026-10-26 요청 "sales_order테이블도 확인해줘",
--       사용자 결정: 생산확정과 똑같이, DB 는 Claude 가 스크립트로)
--   1) client_name(거래처명) → client_code(거래처마스터 거래처코드). 같은 이름이 여럿이면 코드가 작은 것(서버 저장 규칙과 같음).
--   2) product_name(품명(규격))을 지운다. 품목은 product_code 로만 남는다.
--   3) 칸 차례: id · order_date · client_code · product_code · order_qty · …(product_code 를 거래처 바로 뒤로)
--   PostgreSQL 은 칸 자리를 바로 옮길 수 없어 표를 새로 만들어 값을 옮긴 뒤 바꿔 끼운다.
--   - 바꾸기 전 표 전체를 bak_20261026_003_sales_order 에 남긴다.
--   - id 시퀀스(sales_order_id_seq)는 새 표가 그대로 이어 쓴다. 기본값 · NOT NULL · 기본키 · 인덱스는 예전 이름 그대로 다시 만든다.
--   - 거래처마스터에 없는 거래처명(또는 코드 없는 거래처), 제품코드가 비었거나 제품마스터에 없는 줄이 있으면 멈춘다.
--   - 이 표를 가리키는 FK · 뷰 · 트리거는 없다(적용 때 확인).
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'sales_order' AND column_name = 'client_name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'sales_order' AND column_name = 'client_code')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = 'public' AND table_name = 'sales_order' AND column_name = 'product_name') THEN
            RETURN; -- 이미 바뀌었다
        END IF;
        RAISE EXCEPTION 'sales_order 모양이 예상과 다릅니다(client_name 없음). 먼저 확인하세요.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'sales_order' AND column_name = 'product_name') THEN
        RAISE EXCEPTION 'sales_order 모양이 예상과 다릅니다(product_name 없음). 먼저 확인하세요.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.sales_order o
               WHERE NULLIF(o.client_name, '') IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM public.clients c
                                 WHERE c.name = o.client_name AND NULLIF(c.client_code, '') IS NOT NULL)) THEN
        RAISE EXCEPTION 'sales_order.client_name 에 거래처마스터에 없거나 거래처코드가 없는 거래처가 있습니다. 먼저 정리하세요.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.sales_order o
               WHERE NULLIF(o.product_name, '') IS NOT NULL
                 AND (NULLIF(o.product_code, '') IS NULL
                      OR NOT EXISTS (SELECT 1 FROM public.products p WHERE p.code = o.product_code))) THEN
        RAISE EXCEPTION 'sales_order 에 품목명은 있는데 제품코드가 비었거나 제품마스터에 없는 줄이 있습니다. 먼저 product_code 를 채우세요.';
    END IF;

    IF to_regclass('public.bak_20261026_003_sales_order') IS NULL THEN
        CREATE TABLE public.bak_20261026_003_sales_order AS TABLE public.sales_order;
    END IF;

    ALTER SEQUENCE public.sales_order_id_seq OWNED BY NONE;

    CREATE TABLE public.sales_order_new (
        id integer NOT NULL DEFAULT nextval('public.sales_order_id_seq'::regclass),
        order_date text,
        client_code text,
        product_code text,
        order_qty text,
        note text,
        production_date text,
        logistics_date text,
        imported integer DEFAULT 0,
        sort_order integer,
        created_at text,
        imported_production integer DEFAULT 0,
        imported_shipment integer DEFAULT 0,
        is_stock_production integer DEFAULT 0
    );

    INSERT INTO public.sales_order_new (
        id, order_date, client_code, product_code, order_qty, note, production_date, logistics_date,
        imported, sort_order, created_at, imported_production, imported_shipment, is_stock_production
    )
    SELECT
        o.id, o.order_date,
        CASE WHEN NULLIF(o.client_name, '') IS NULL THEN o.client_name
             ELSE (SELECT c.client_code FROM public.clients c
                    WHERE c.name = o.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                    ORDER BY c.client_code LIMIT 1) END,
        o.product_code, o.order_qty, o.note, o.production_date, o.logistics_date,
        o.imported, o.sort_order, o.created_at, o.imported_production, o.imported_shipment, o.is_stock_production
    FROM public.sales_order o;

    DROP TABLE public.sales_order;
    ALTER TABLE public.sales_order_new RENAME TO sales_order;
    ALTER TABLE public.sales_order RENAME CONSTRAINT sales_order_new_id_not_null TO sales_order_id_not_null;
    ALTER TABLE public.sales_order ADD CONSTRAINT sales_order_pkey PRIMARY KEY (id);
    CREATE INDEX idx_sales_order_product_code ON public.sales_order USING btree (product_code);
    ALTER SEQUENCE public.sales_order_id_seq OWNED BY public.sales_order.id;
END $$;

COMMIT;
