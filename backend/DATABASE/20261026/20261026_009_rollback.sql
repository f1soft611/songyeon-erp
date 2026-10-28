-- 20261026_009_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_009 를 되돌린다: 코드 → 이름, 칸 이름도 예전으로.
--   - 백업 표(bak_20261026_009_code_values)에 있고 값이 바꾼 코드 그대로인 줄은 백업의 예전 값으로 되돌린다.
--   - 적용 뒤 새로 넣었거나 고친 줄은 마스터 · 공통코드의 이름을 넣는다(못 찾으면 그대로).
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(입고 · 재고조정 · 원재료 · 창고 · 재고 매퍼와 서비스)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
DECLARE
    spec text[][] := ARRAY[
        ARRAY['material_receiving', 'id', 'client_name', 'client_code', 'client'],
        ARRAY['material_receiving', 'id', 'warehouse', 'warehouse_cd', 'warehouse'],
        ARRAY['material_receiving', 'id', 'tax_type', 'tax_type', 'tax'],
        ARRAY['materials', 'code', 'warehouse', 'warehouse_cd', 'warehouse'],
        ARRAY['material_stock_schedule', 'id', 'warehouse', 'warehouse_cd', 'warehouse'],
        ARRAY['material_warehouse_move', 'id', 'from_warehouse', 'from_warehouse_cd', 'warehouse'],
        ARRAY['material_warehouse_move', 'id', 'to_warehouse', 'to_warehouse_cd', 'warehouse']];
    i int;
    tbl text; keycol text; oldcol text; newcol text; kind text;
    has_backup boolean := to_regclass('public.bak_20261026_009_code_values') IS NOT NULL;
BEGIN
    DROP TABLE IF EXISTS pg_temp.tmp_20261026_009_name;
    CREATE TEMP TABLE tmp_20261026_009_name ON COMMIT DROP AS
    SELECT 'client'::text AS kind, c.client_code AS cd, min(c.name) AS nm
    FROM public.clients c WHERE NULLIF(c.client_code, '') IS NOT NULL GROUP BY c.client_code
    UNION ALL
    SELECT 'warehouse', w.warehouse_cd, min(w.warehouse_nm) FROM public.tb_warehouse w GROUP BY w.warehouse_cd
    UNION ALL
    SELECT 'tax', i.item_code, min(i.item_nm)
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'TAX_CATEGORY'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
    GROUP BY i.item_code;

    IF NOT has_backup THEN
        CREATE TEMP TABLE bak_20261026_009_code_values_empty (table_name text, column_name text, row_key text, old_value text, new_value text) ON COMMIT DROP;
    END IF;

    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; keycol := spec[i][2]; oldcol := spec[i][3]; newcol := spec[i][4]; kind := spec[i][5];
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = tbl AND column_name = newcol) THEN
            CONTINUE; -- 이미 되돌렸다
        END IF;
        IF newcol = oldcol AND NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'client_code') THEN
            CONTINUE; -- tax_type: 같은 표의 다른 칸이 이미 되돌려졌으면 이것도 되돌린 것이다
        END IF;
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET %3$I = COALESCE(
                    (SELECT b.old_value FROM %5$s b
                      WHERE b.table_name = %1$L AND b.column_name = %4$L AND b.row_key = s.%2$I::text AND b.new_value = s.%3$I),
                    (SELECT n.nm FROM tmp_20261026_009_name n WHERE n.kind = %6$L AND n.cd = s.%3$I),
                    s.%3$I)
            WHERE NULLIF(s.%3$I, '') IS NOT NULL
        $q$, tbl, keycol, newcol, oldcol,
             CASE WHEN has_backup THEN 'public.bak_20261026_009_code_values' ELSE 'bak_20261026_009_code_values_empty' END, kind);
    END LOOP;

    -- 이름은 값을 다 되돌린 뒤 바꾼다(tax_type 확인에 client_code 칸을 쓰므로)
    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; oldcol := spec[i][3]; newcol := spec[i][4];
        IF newcol <> oldcol AND EXISTS (SELECT 1 FROM information_schema.columns
                                         WHERE table_schema = 'public' AND table_name = tbl AND column_name = newcol) THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', tbl, newcol, oldcol);
        END IF;
    END LOOP;
END $$;

COMMIT;
