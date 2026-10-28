-- 20261026_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL 18)
-- 20261026_001 을 되돌린다: production_schedule 을 예전 모양으로 다시 만든다.
--   - product_name(4번째, client_name 뒤)을 되살리고 product_code 는 맨 끝으로 돌린다.
--   - product_name 값은 사용자가 지울 때 따로 남기지 않아 제품마스터에서 '품명(규격)'(규격이 없으면 품명)으로 다시 채운다.
--     예전 값과 글자가 다를 수 있다(제품명을 그 뒤에 고쳤으면 고친 이름이 들어간다).
--   - id 시퀀스 · 기본값 · NOT NULL · 기본키 · 인덱스는 예전 이름 그대로 다시 만든다.
--   - 백업 표 bak_20261026_001_production_schedule 은 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼의 product_name)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다(product_name 이 이미 있으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'product_name') THEN
        RETURN;
    END IF;

    ALTER SEQUENCE public.production_schedule_id_seq OWNED BY NONE;

    CREATE TABLE public.production_schedule_old (
        id integer NOT NULL DEFAULT nextval('public.production_schedule_id_seq'::regclass),
        schedule_date text,
        client_name text,
        product_name text,
        order_qty text,
        actual_qty text,
        note text,
        sort_order integer,
        created_at text,
        logistics_date text,
        lot_no text,
        logistics_actual_qty text,
        ship_vehicle text,
        ship_packing_method text,
        ship_confirmed integer DEFAULT 0,
        ship_note text,
        visit_order integer,
        driver_name text,
        charter_info text,
        charter_amount double precision,
        source_order_id integer,
        is_stock_production integer DEFAULT 0,
        box_qty double precision,
        product_code text
    );

    INSERT INTO public.production_schedule_old (
        id, schedule_date, client_name, product_name, order_qty, actual_qty, note, sort_order, created_at,
        logistics_date, lot_no, logistics_actual_qty, ship_vehicle, ship_packing_method, ship_confirmed, ship_note,
        visit_order, driver_name, charter_info, charter_amount, source_order_id, is_stock_production, box_qty, product_code
    )
    SELECT
        s.id, s.schedule_date, s.client_name,
        (SELECT CASE WHEN p.spec IS NOT NULL AND p.spec != '' THEN p.name || '(' || p.spec || ')' ELSE p.name END
           FROM public.products p WHERE p.code = s.product_code),
        s.order_qty, s.actual_qty, s.note, s.sort_order, s.created_at,
        s.logistics_date, s.lot_no, s.logistics_actual_qty, s.ship_vehicle, s.ship_packing_method, s.ship_confirmed, s.ship_note,
        s.visit_order, s.driver_name, s.charter_info, s.charter_amount, s.source_order_id, s.is_stock_production, s.box_qty, s.product_code
    FROM public.production_schedule s;

    DROP TABLE public.production_schedule;
    ALTER TABLE public.production_schedule_old RENAME TO production_schedule;
    ALTER TABLE public.production_schedule RENAME CONSTRAINT production_schedule_old_id_not_null TO production_schedule_id_not_null;
    ALTER TABLE public.production_schedule ADD CONSTRAINT production_schedule_pkey PRIMARY KEY (id);
    CREATE INDEX idx_production_schedule_actual_qty ON public.production_schedule USING btree (actual_qty);
    CREATE INDEX idx_production_schedule_lot_no ON public.production_schedule USING btree (lot_no);
    CREATE INDEX idx_production_schedule_product_code ON public.production_schedule USING btree (product_code);
    CREATE INDEX idx_production_schedule_schedule_date ON public.production_schedule USING btree (schedule_date);
    ALTER SEQUENCE public.production_schedule_id_seq OWNED BY public.production_schedule.id;
END $$;

COMMIT;
