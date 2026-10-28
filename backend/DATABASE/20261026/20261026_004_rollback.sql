-- 20261026_004_rollback.sql
-- 대상 DB: songyeon (PostgreSQL 18)
-- 20261026_004 를 되돌린다: logistics_schedule 을 예전 모양으로 다시 만든다.
--   칸 차례: id · schedule_date · client_name · product_name · order_qty · … · box_qty · product_code
--   - 백업 표(bak_20261026_004_logistics_schedule)에 있고 코드가 그대로인 줄은 백업의 예전 이름을 넣는다.
--   - 적용 뒤 새로 넣었거나 거래처 · 품목을 바꾼 줄은 거래처마스터 이름, 제품마스터 '품명(규격)'(규격이 없으면 품명)을 넣는다.
--   - id 시퀀스 · 기본값 · NOT NULL · 기본키 · 인덱스는 예전 이름 그대로 다시 만든다.
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼의 client_code · product_name)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다(client_name 이 이미 있으면 건너뛴다).

BEGIN;

DO $$
DECLARE
    has_backup boolean := to_regclass('public.bak_20261026_004_logistics_schedule') IS NOT NULL;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'logistics_schedule' AND column_name = 'client_name') THEN
        RETURN;
    END IF;

    -- 백업이 없으면 빈 백업으로 이름만 거래처 · 제품마스터에서 찾는다
    IF NOT has_backup THEN
        CREATE TEMP TABLE bak_20261026_004_logistics_schedule_empty (id integer, client_name text, product_name text, product_code text) ON COMMIT DROP;
    END IF;

    ALTER SEQUENCE public.logistics_schedule_id_seq OWNED BY NONE;

    CREATE TABLE public.logistics_schedule_old (
        id integer NOT NULL DEFAULT nextval('public.logistics_schedule_id_seq'::regclass),
        schedule_date text,
        client_name text,
        product_name text,
        order_qty text,
        note text,
        sort_order integer,
        created_at text,
        actual_qty text,
        lot_id integer,
        source_order_id integer,
        vehicle text,
        packing_method text,
        ship_confirmed integer DEFAULT 0,
        ship_note text,
        visit_order integer,
        driver_name text,
        charter_info text,
        charter_amount double precision,
        box_qty double precision,
        product_code text
    );

    EXECUTE format($q$
        INSERT INTO public.logistics_schedule_old (
            id, schedule_date, client_name, product_name, order_qty, note, sort_order, created_at, actual_qty, lot_id,
            source_order_id, vehicle, packing_method, ship_confirmed, ship_note, visit_order, driver_name, charter_info,
            charter_amount, box_qty, product_code
        )
        SELECT
            o.id, o.schedule_date,
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
            o.order_qty, o.note, o.sort_order, o.created_at, o.actual_qty, o.lot_id,
            o.source_order_id, o.vehicle, o.packing_method, o.ship_confirmed, o.ship_note, o.visit_order, o.driver_name, o.charter_info,
            o.charter_amount, o.box_qty, o.product_code
        FROM public.logistics_schedule o
    $q$, CASE WHEN has_backup THEN 'public.bak_20261026_004_logistics_schedule' ELSE 'bak_20261026_004_logistics_schedule_empty' END);

    DROP TABLE public.logistics_schedule;
    ALTER TABLE public.logistics_schedule_old RENAME TO logistics_schedule;
    ALTER TABLE public.logistics_schedule RENAME CONSTRAINT logistics_schedule_old_id_not_null TO logistics_schedule_id_not_null;
    ALTER TABLE public.logistics_schedule ADD CONSTRAINT logistics_schedule_pkey PRIMARY KEY (id);
    CREATE INDEX idx_logistics_schedule_product_code ON public.logistics_schedule USING btree (product_code);
    ALTER SEQUENCE public.logistics_schedule_id_seq OWNED BY public.logistics_schedule.id;
END $$;

COMMIT;
