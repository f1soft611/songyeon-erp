-- 20261026_004_logistics_schedule_client_product_code.sql
-- 대상 DB: songyeon (PostgreSQL 18)
-- 목적: 출하등록(logistics_schedule)을 생산확정 · 수주(20261026_001 ~ 003)와 같은 모양으로(2026-10-26 요청 "logistics_schedule 테이블도 확인",
--       사용자 결정: 똑같이 바꿈, DB 는 Claude 가 스크립트로)
--   1) client_name(거래처명) → client_code(거래처마스터 거래처코드). 같은 이름이 여럿이면 코드가 작은 것(서버 저장 규칙과 같음).
--   2) product_name(품명(규격))을 지운다. 품목은 product_code 로만 남는다.
--   3) 칸 차례: id · schedule_date · client_code · product_code · order_qty · …(product_code 를 거래처 바로 뒤로)
--   PostgreSQL 은 칸 자리를 바로 옮길 수 없어 표를 새로 만들어 값을 옮긴 뒤 바꿔 끼운다.
--   - 바꾸기 전 표 전체를 bak_20261026_004_logistics_schedule 에 남긴다.
--   - id 시퀀스(logistics_schedule_id_seq)는 새 표가 그대로 이어 쓴다. 기본값 · NOT NULL · 기본키 · 인덱스는 예전 이름 그대로 다시 만든다.
--   - 거래처마스터에 없는 거래처명(또는 코드 없는 거래처), 품목명은 있는데 제품코드가 비었거나 제품마스터에 없는 줄이 있으면 멈춘다.
--   - 이 표를 가리키는 FK · 뷰 · 트리거는 없다(적용 때 확인). shipment_lot_allocation 등은 id 로만 가리킨다(id 그대로).
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'logistics_schedule' AND column_name = 'client_name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'logistics_schedule' AND column_name = 'client_code')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = 'public' AND table_name = 'logistics_schedule' AND column_name = 'product_name') THEN
            RETURN; -- 이미 바뀌었다
        END IF;
        RAISE EXCEPTION 'logistics_schedule 모양이 예상과 다릅니다(client_name 없음). 먼저 확인하세요.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'logistics_schedule' AND column_name = 'product_name') THEN
        RAISE EXCEPTION 'logistics_schedule 모양이 예상과 다릅니다(product_name 없음). 먼저 확인하세요.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.logistics_schedule o
               WHERE NULLIF(o.client_name, '') IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM public.clients c
                                 WHERE c.name = o.client_name AND NULLIF(c.client_code, '') IS NOT NULL)) THEN
        RAISE EXCEPTION 'logistics_schedule.client_name 에 거래처마스터에 없거나 거래처코드가 없는 거래처가 있습니다. 먼저 정리하세요.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.logistics_schedule o
               WHERE NULLIF(o.product_name, '') IS NOT NULL
                 AND (NULLIF(o.product_code, '') IS NULL
                      OR NOT EXISTS (SELECT 1 FROM public.products p WHERE p.code = o.product_code))) THEN
        RAISE EXCEPTION 'logistics_schedule 에 품목명은 있는데 제품코드가 비었거나 제품마스터에 없는 줄이 있습니다. 먼저 product_code 를 채우세요.';
    END IF;

    IF to_regclass('public.bak_20261026_004_logistics_schedule') IS NULL THEN
        CREATE TABLE public.bak_20261026_004_logistics_schedule AS TABLE public.logistics_schedule;
    END IF;

    ALTER SEQUENCE public.logistics_schedule_id_seq OWNED BY NONE;

    CREATE TABLE public.logistics_schedule_new (
        id integer NOT NULL DEFAULT nextval('public.logistics_schedule_id_seq'::regclass),
        schedule_date text,
        client_code text,
        product_code text,
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
        box_qty double precision
    );

    INSERT INTO public.logistics_schedule_new (
        id, schedule_date, client_code, product_code, order_qty, note, sort_order, created_at, actual_qty, lot_id,
        source_order_id, vehicle, packing_method, ship_confirmed, ship_note, visit_order, driver_name, charter_info,
        charter_amount, box_qty
    )
    SELECT
        o.id, o.schedule_date,
        CASE WHEN NULLIF(o.client_name, '') IS NULL THEN o.client_name
             ELSE (SELECT c.client_code FROM public.clients c
                    WHERE c.name = o.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                    ORDER BY c.client_code LIMIT 1) END,
        o.product_code, o.order_qty, o.note, o.sort_order, o.created_at, o.actual_qty, o.lot_id,
        o.source_order_id, o.vehicle, o.packing_method, o.ship_confirmed, o.ship_note, o.visit_order, o.driver_name, o.charter_info,
        o.charter_amount, o.box_qty
    FROM public.logistics_schedule o;

    DROP TABLE public.logistics_schedule;
    ALTER TABLE public.logistics_schedule_new RENAME TO logistics_schedule;
    ALTER TABLE public.logistics_schedule RENAME CONSTRAINT logistics_schedule_new_id_not_null TO logistics_schedule_id_not_null;
    ALTER TABLE public.logistics_schedule ADD CONSTRAINT logistics_schedule_pkey PRIMARY KEY (id);
    CREATE INDEX idx_logistics_schedule_product_code ON public.logistics_schedule USING btree (product_code);
    ALTER SEQUENCE public.logistics_schedule_id_seq OWNED BY public.logistics_schedule.id;
END $$;

COMMIT;
