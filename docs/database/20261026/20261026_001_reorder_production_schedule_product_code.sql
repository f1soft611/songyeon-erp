-- 20261026_001_reorder_production_schedule_product_code.sql
-- 대상 DB: songyeon (PostgreSQL 18)
-- 목적: production_schedule.product_code 를 client_name 바로 뒤(4번째)로 옮긴다(2026-10-26 요청
--       "컬럼 위치도 client_name 뒤였으면 좋겠어", 사용자 결정: DB 는 Claude 가 스크립트로)
--   PostgreSQL 은 칸 자리를 바로 옮길 수 없어 표를 새로 만들어 값을 옮긴 뒤 바꿔 끼운다.
--   1) 바꾸기 전 표 전체를 bak_20261026_001_production_schedule 에 남긴다.
--   2) id 시퀀스(production_schedule_id_seq)는 새 표가 그대로 이어 쓴다(번호가 처음부터 다시 시작하지 않는다).
--   3) 칸 형식 · 기본값 · NOT NULL · 기본키 · 인덱스 4개는 예전 이름 그대로 다시 만든다.
--   - 먼저 20261026_001_drop_production_schedule_product_name.sql 이 적용돼 있어야 한다(product_name 이 있으면 멈춘다).
--   - 이 표를 가리키는 FK · 뷰 · 트리거는 없다(적용 때 확인).
-- 다시 돌려도 결과가 같다(이미 client_name 바로 뒤면 건너뛴다).

BEGIN;

DO $$
DECLARE
    client_pos int;
    code_pos int;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'product_name') THEN
        RAISE EXCEPTION 'production_schedule.product_name 이 아직 있습니다. 20261026_001_drop_production_schedule_product_name.sql 을 먼저 적용하세요.';
    END IF;

    SELECT ordinal_position INTO client_pos FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'client_name';
    SELECT ordinal_position INTO code_pos FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'product_code';
    -- 지운 칸이 있으면 번호가 비므로 '그 사이에 다른 칸이 없는지' 로 본다
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'production_schedule'
                     AND ordinal_position > client_pos AND ordinal_position < code_pos) AND code_pos > client_pos THEN
        RETURN;
    END IF;

    IF to_regclass('public.bak_20261026_001_production_schedule') IS NULL THEN
        CREATE TABLE public.bak_20261026_001_production_schedule AS TABLE public.production_schedule;
    END IF;

    ALTER SEQUENCE public.production_schedule_id_seq OWNED BY NONE;

    CREATE TABLE public.production_schedule_new (
        id integer NOT NULL DEFAULT nextval('public.production_schedule_id_seq'::regclass),
        schedule_date text,
        client_name text,
        product_code text,
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
        box_qty double precision
    );

    INSERT INTO public.production_schedule_new (
        id, schedule_date, client_name, product_code, order_qty, actual_qty, note, sort_order, created_at,
        logistics_date, lot_no, logistics_actual_qty, ship_vehicle, ship_packing_method, ship_confirmed, ship_note,
        visit_order, driver_name, charter_info, charter_amount, source_order_id, is_stock_production, box_qty
    )
    SELECT
        id, schedule_date, client_name, product_code, order_qty, actual_qty, note, sort_order, created_at,
        logistics_date, lot_no, logistics_actual_qty, ship_vehicle, ship_packing_method, ship_confirmed, ship_note,
        visit_order, driver_name, charter_info, charter_amount, source_order_id, is_stock_production, box_qty
    FROM public.production_schedule;

    DROP TABLE public.production_schedule;
    ALTER TABLE public.production_schedule_new RENAME TO production_schedule;
    ALTER TABLE public.production_schedule RENAME CONSTRAINT production_schedule_new_id_not_null TO production_schedule_id_not_null;
    ALTER TABLE public.production_schedule ADD CONSTRAINT production_schedule_pkey PRIMARY KEY (id);
    CREATE INDEX idx_production_schedule_actual_qty ON public.production_schedule USING btree (actual_qty);
    CREATE INDEX idx_production_schedule_lot_no ON public.production_schedule USING btree (lot_no);
    CREATE INDEX idx_production_schedule_product_code ON public.production_schedule USING btree (product_code);
    CREATE INDEX idx_production_schedule_schedule_date ON public.production_schedule USING btree (schedule_date);
    ALTER SEQUENCE public.production_schedule_id_seq OWNED BY public.production_schedule.id;
END $$;

COMMIT;
