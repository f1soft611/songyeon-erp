-- 20261026_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL 18)
-- 20261026_003 을 되돌린다: sales_order 를 예전 모양으로 다시 만든다.
--   칸 차례: id · order_date · client_name · product_name · order_qty · … · is_stock_production · product_code
--   - 백업 표(bak_20261026_003_sales_order)에 있고 코드가 그대로인 줄은 백업의 예전 이름을 넣는다.
--   - 적용 뒤 새로 넣었거나 거래처 · 품목을 바꾼 줄은 거래처마스터 이름, 제품마스터 '품명(규격)'(규격이 없으면 품명)을 넣는다.
--   - id 시퀀스 · 기본값 · NOT NULL · 기본키 · 인덱스는 예전 이름 그대로 다시 만든다.
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼의 client_code · product_name)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다(client_name 이 이미 있으면 건너뛴다).

BEGIN;

DO $$
DECLARE
    has_backup boolean := to_regclass('public.bak_20261026_003_sales_order') IS NOT NULL;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'sales_order' AND column_name = 'client_name') THEN
        RETURN;
    END IF;

    -- 백업이 없으면 빈 백업으로 이름만 거래처 · 제품마스터에서 찾는다
    IF NOT has_backup THEN
        CREATE TEMP TABLE bak_20261026_003_sales_order_empty (id integer, client_name text, product_name text, product_code text) ON COMMIT DROP;
    END IF;

    ALTER SEQUENCE public.sales_order_id_seq OWNED BY NONE;

    CREATE TABLE public.sales_order_old (
        id integer NOT NULL DEFAULT nextval('public.sales_order_id_seq'::regclass),
        order_date text,
        client_name text,
        product_name text,
        order_qty text,
        note text,
        production_date text,
        logistics_date text,
        imported integer DEFAULT 0,
        sort_order integer,
        created_at text,
        imported_production integer DEFAULT 0,
        imported_shipment integer DEFAULT 0,
        is_stock_production integer DEFAULT 0,
        product_code text
    );

    EXECUTE format($q$
        INSERT INTO public.sales_order_old (
            id, order_date, client_name, product_name, order_qty, note, production_date, logistics_date,
            imported, sort_order, created_at, imported_production, imported_shipment, is_stock_production, product_code
        )
        SELECT
            o.id, o.order_date,
            CASE WHEN NULLIF(o.client_code, '') IS NULL THEN o.client_code
                 ELSE COALESCE(
                     (SELECT b.client_name FROM %1$s b
                       WHERE b.id = o.id
                         AND (SELECT c.client_code FROM public.clients c
                               WHERE c.name = b.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                               ORDER BY c.client_code LIMIT 1) = o.client_code),
                     (SELECT c.name FROM public.clients c WHERE c.client_code = o.client_code LIMIT 1),
                     o.client_code) END,
            CASE WHEN NULLIF(o.product_code, '') IS NULL
                 THEN (SELECT b.product_name FROM %1$s b WHERE b.id = o.id AND NULLIF(b.product_code, '') IS NULL)
                 ELSE COALESCE(
                     (SELECT b.product_name FROM %1$s b WHERE b.id = o.id AND b.product_code = o.product_code),
                     (SELECT CASE WHEN p.spec IS NOT NULL AND p.spec != '' THEN p.name || '(' || p.spec || ')' ELSE p.name END
                        FROM public.products p WHERE p.code = o.product_code)) END,
            o.order_qty, o.note, o.production_date, o.logistics_date,
            o.imported, o.sort_order, o.created_at, o.imported_production, o.imported_shipment, o.is_stock_production, o.product_code
        FROM public.sales_order o
    $q$, CASE WHEN has_backup THEN 'public.bak_20261026_003_sales_order' ELSE 'bak_20261026_003_sales_order_empty' END);

    DROP TABLE public.sales_order;
    ALTER TABLE public.sales_order_old RENAME TO sales_order;
    ALTER TABLE public.sales_order RENAME CONSTRAINT sales_order_old_id_not_null TO sales_order_id_not_null;
    ALTER TABLE public.sales_order ADD CONSTRAINT sales_order_pkey PRIMARY KEY (id);
    CREATE INDEX idx_sales_order_product_code ON public.sales_order USING btree (product_code);
    ALTER SEQUENCE public.sales_order_id_seq OWNED BY public.sales_order.id;
END $$;

COMMIT;
