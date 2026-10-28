-- 20261026_005_ship_vehicle_packing_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 출하확정의 배차 · 포장방법을 공통코드 이름이 아니라 코드로 저장(2026-10-26 요청 "이 테이블은 vehicle 컬럼도 확인해야겠다",
--       사용자 결정: 배차와 포장방법 모두 코드로)
--   - logistics_schedule.vehicle · production_schedule.ship_vehicle: 공통코드 VEHICLE_INFO(차량정보) 이름 → item_code
--   - logistics_schedule.packing_method · production_schedule.ship_packing_method: 공통코드 PACKING_TYPE 이름 → item_code
--   - 같은 이름이 여럿이면 사용 중 → 정렬순서 → 코드 순으로 하나(서버 저장 규칙과 같음).
--   - 칸 이름 · 형식은 그대로(text). 빈 값은 그대로.
--   - 이미 코드인 값은 건너뛴다. 공통코드에 없는 이름이 있으면 바꾸지 않고 멈춘다.
--   - 롤백이 정확하도록 바꾸는 줄의 예전 값을 bak_20261026_005_ship_vehicle_packing 에 남긴다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
DECLARE
    spec text[][] := ARRAY[
        ARRAY['logistics_schedule', 'vehicle', 'VEHICLE_INFO'],
        ARRAY['logistics_schedule', 'packing_method', 'PACKING_TYPE'],
        ARRAY['production_schedule', 'ship_vehicle', 'VEHICLE_INFO'],
        ARRAY['production_schedule', 'ship_packing_method', 'PACKING_TYPE']];
    i int;
    bad int;
BEGIN
    IF to_regclass('public.bak_20261026_005_ship_vehicle_packing') IS NULL THEN
        CREATE TABLE public.bak_20261026_005_ship_vehicle_packing (
            table_name text NOT NULL,
            column_name text NOT NULL,
            row_id integer NOT NULL,
            old_value text,
            new_value text,
            PRIMARY KEY (table_name, column_name, row_id)
        );
    END IF;

    DROP TABLE IF EXISTS pg_temp.tmp_20261026_005_code;
    CREATE TEMP TABLE tmp_20261026_005_code ON COMMIT DROP AS
    SELECT g.group_code, i.item_code, i.item_nm,
           row_number() OVER (PARTITION BY g.group_code, i.item_nm
                              ORDER BY CASE WHEN i.use_at = 'Y' THEN 0 ELSE 1 END, i.sort_order, i.item_code) AS rn
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
    WHERE g.group_code IN ('VEHICLE_INFO', 'PACKING_TYPE');

    FOR i IN 1 .. array_length(spec, 1) LOOP
        EXECUTE format($q$
            SELECT count(*) FROM public.%1$I s
            WHERE NULLIF(s.%2$I, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_005_code c WHERE c.group_code = %3$L AND c.item_code = s.%2$I)
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_005_code c WHERE c.group_code = %3$L AND c.item_nm = s.%2$I)
        $q$, spec[i][1], spec[i][2], spec[i][3]) INTO bad;
        IF bad > 0 THEN
            RAISE EXCEPTION '%.% 에 공통코드 %에 없는 값이 % 건 있습니다. 먼저 정리하세요.', spec[i][1], spec[i][2], spec[i][3], bad;
        END IF;
    END LOOP;

    FOR i IN 1 .. array_length(spec, 1) LOOP
        EXECUTE format($q$
            INSERT INTO public.bak_20261026_005_ship_vehicle_packing (table_name, column_name, row_id, old_value, new_value)
            SELECT %1$L, %2$L, s.id, s.%2$I, c.item_code
            FROM public.%1$I s
            JOIN tmp_20261026_005_code c ON c.group_code = %3$L AND c.item_nm = s.%2$I AND c.rn = 1
            WHERE NULLIF(s.%2$I, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_005_code k WHERE k.group_code = %3$L AND k.item_code = s.%2$I)
            ON CONFLICT DO NOTHING
        $q$, spec[i][1], spec[i][2], spec[i][3]);
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET %2$I = c.item_code
            FROM tmp_20261026_005_code c
            WHERE c.group_code = %3$L AND c.item_nm = s.%2$I AND c.rn = 1
              AND NULLIF(s.%2$I, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_005_code k WHERE k.group_code = %3$L AND k.item_code = s.%2$I)
        $q$, spec[i][1], spec[i][2], spec[i][3]);
    END LOOP;
END $$;

COMMIT;
