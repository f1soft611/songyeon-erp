-- 20261026_006_ship_driver_id.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 출하확정 운행자를 직원 이름이 아니라 사번(employees.id)으로 저장(2026-10-26 요청 "driver_name 도 사번으로 들어가야됳거같은데",
--       사용자 결정: 직원만 사번 저장, 칸 이름도 driver_id 로)
--   - logistics_schedule.driver_name · production_schedule.driver_name: 직원 이름 → 사번, 칸 이름 → driver_id(자리 · 형식 text 그대로)
--   - 같은 이름의 직원이 여럿이면 사번이 작은 것(서버 저장 규칙과 같음).
--   - 직원 목록에 없는 이름이 있으면 바꾸지 않고 멈춘다. 빈 값은 그대로.
--   - 롤백이 정확하도록 바꾸는 줄의 예전 값을 bak_20261026_006_ship_driver 에 남긴다.
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
DECLARE
    tbl text;
    bad int;
BEGIN
    IF to_regclass('public.bak_20261026_006_ship_driver') IS NULL THEN
        CREATE TABLE public.bak_20261026_006_ship_driver (
            table_name text NOT NULL,
            row_id integer NOT NULL,
            old_value text,
            new_value text,
            PRIMARY KEY (table_name, row_id)
        );
    END IF;

    FOREACH tbl IN ARRAY ARRAY['logistics_schedule', 'production_schedule'] LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'driver_name') THEN
            CONTINUE; -- 이미 바뀌었다
        END IF;

        EXECUTE format($q$
            SELECT count(*) FROM public.%1$I s
            WHERE NULLIF(s.driver_name, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.name = s.driver_name)
        $q$, tbl) INTO bad;
        IF bad > 0 THEN
            RAISE EXCEPTION '%.driver_name 에 직원 목록에 없는 이름이 % 건 있습니다. 먼저 정리하세요.', tbl, bad;
        END IF;

        EXECUTE format($q$
            INSERT INTO public.bak_20261026_006_ship_driver (table_name, row_id, old_value, new_value)
            SELECT %1$L, s.id, s.driver_name,
                   (SELECT e.id FROM public.employees e WHERE e.name = s.driver_name ORDER BY e.id LIMIT 1)
            FROM public.%1$I s
            WHERE NULLIF(s.driver_name, '') IS NOT NULL
            ON CONFLICT DO NOTHING
        $q$, tbl);
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET driver_name = (SELECT e.id FROM public.employees e WHERE e.name = s.driver_name ORDER BY e.id LIMIT 1)
            WHERE NULLIF(s.driver_name, '') IS NOT NULL
        $q$, tbl);
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN driver_name TO driver_id', tbl);
    END LOOP;
END $$;

COMMIT;
