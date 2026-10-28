-- 20261026_005_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_005 를 되돌린다: 배차 · 포장방법 코드 → 공통코드 이름.
--   - 백업 표(bak_20261026_005_ship_vehicle_packing)에 있고 값이 바꾼 코드 그대로인 줄은 백업의 예전 이름으로 되돌린다.
--   - 적용 뒤 새로 확정했거나 고친 줄(코드가 들어 있는 줄)은 공통코드 이름을 넣는다.
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼 · 출하확정 서비스)도 함께 돌려야 한다.
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
BEGIN
    IF to_regclass('public.bak_20261026_005_ship_vehicle_packing') IS NOT NULL THEN
        FOR i IN 1 .. array_length(spec, 1) LOOP
            EXECUTE format($q$
                UPDATE public.%1$I s
                SET %2$I = b.old_value
                FROM public.bak_20261026_005_ship_vehicle_packing b
                WHERE b.table_name = %1$L AND b.column_name = %2$L AND b.row_id = s.id AND b.new_value = s.%2$I
            $q$, spec[i][1], spec[i][2]);
        END LOOP;
    END IF;

    FOR i IN 1 .. array_length(spec, 1) LOOP
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET %2$I = i.item_nm
            FROM public.tb_common_code_item i
            JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = %3$L
            JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
            WHERE i.item_code = s.%2$I AND NULLIF(s.%2$I, '') IS NOT NULL
        $q$, spec[i][1], spec[i][2], spec[i][3]);
    END LOOP;
END $$;

COMMIT;
