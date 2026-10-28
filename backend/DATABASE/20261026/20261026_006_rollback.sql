-- 20261026_006_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_006 을 되돌린다: driver_id(사번) → driver_name(직원 이름).
--   - 백업 표(bak_20261026_006_ship_driver)에 있고 사번이 그대로인 줄은 백업의 예전 이름으로 되돌린다.
--   - 적용 뒤 새로 확정했거나 고친 줄은 직원 목록에서 그 사번의 이름을 넣는다(없으면 사번 그대로).
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼 · 출하확정 서비스)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다(driver_name 이 이미 있으면 건너뛴다).

BEGIN;

DO $$
DECLARE
    tbl text;
    has_backup boolean := to_regclass('public.bak_20261026_006_ship_driver') IS NOT NULL;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['logistics_schedule', 'production_schedule'] LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'driver_id') THEN
            CONTINUE;
        END IF;
        IF has_backup THEN
            EXECUTE format($q$
                UPDATE public.%1$I s
                SET driver_id = COALESCE(
                        (SELECT b.old_value FROM public.bak_20261026_006_ship_driver b
                          WHERE b.table_name = %1$L AND b.row_id = s.id AND b.new_value = s.driver_id),
                        (SELECT e.name FROM public.employees e WHERE e.id = s.driver_id LIMIT 1),
                        s.driver_id)
                WHERE NULLIF(s.driver_id, '') IS NOT NULL
            $q$, tbl);
        ELSE
            EXECUTE format($q$
                UPDATE public.%1$I s
                SET driver_id = COALESCE((SELECT e.name FROM public.employees e WHERE e.id = s.driver_id LIMIT 1), s.driver_id)
                WHERE NULLIF(s.driver_id, '') IS NOT NULL
            $q$, tbl);
        END IF;
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN driver_id TO driver_name', tbl);
    END LOOP;
END $$;

COMMIT;
