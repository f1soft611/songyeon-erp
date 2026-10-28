-- 20261026_010_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_010 을 되돌린다: 사번 → 직원 이름, 거래처코드 → 거래처명, 칸 이름도 예전으로.
--   - 백업 표(bak_20261026_010_by_values)에 있고 값이 바꾼 그대로인 줄은 백업의 예전 값으로 되돌린다.
--   - 적용 뒤 새로 넣은 줄은 직원 이름 · 거래처마스터 이름을 넣는다(못 찾으면 그대로).
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼 · 서비스 · 컨트롤러)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
DECLARE
    spec text[][] := ARRAY[
        ARRAY['product_stock_movement', 'id', 'client_name', 'client_code', 'client'],
        ARRAY['product_stock_movement', 'id', 'created_by_name', 'created_by', 'employee'],
        ARRAY['material_warehouse_move', 'id', 'moved_by', 'moved_by', 'employee'],
        ARRAY['production_material_substitution', 'id', 'created_by', 'created_by', 'employee'],
        ARRAY['attachment', 'id', 'uploaded_by', 'uploaded_by', 'employee'],
        ARRAY['document_folder', 'id', 'created_by', 'created_by', 'employee'],
        ARRAY['document_folder', 'id', 'lock_by', 'lock_by', 'employee']];
    i int;
    tbl text; keycol text; oldcol text; newcol text; kind text;
    done_marker boolean;
    has_backup boolean := to_regclass('public.bak_20261026_010_by_values') IS NOT NULL;
BEGIN
    -- product_stock_movement 의 칸 이름이 이미 예전이면 모두 되돌린 것이다
    done_marker := EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = 'public' AND table_name = 'product_stock_movement' AND column_name = 'client_name');
    IF done_marker THEN
        RETURN;
    END IF;

    DROP TABLE IF EXISTS pg_temp.tmp_20261026_010_name;
    CREATE TEMP TABLE tmp_20261026_010_name ON COMMIT DROP AS
    SELECT 'client'::text AS kind, c.client_code AS cd, min(c.name) AS nm
    FROM public.clients c WHERE NULLIF(c.client_code, '') IS NOT NULL GROUP BY c.client_code
    UNION ALL
    SELECT 'employee', e.id, min(e.name) FROM public.employees e GROUP BY e.id;

    IF NOT has_backup THEN
        CREATE TEMP TABLE bak_20261026_010_by_values_empty (table_name text, column_name text, row_key text, old_value text, new_value text) ON COMMIT DROP;
    END IF;

    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; keycol := spec[i][2]; oldcol := spec[i][3]; newcol := spec[i][4]; kind := spec[i][5];
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET %3$I = COALESCE(
                    (SELECT b.old_value FROM %5$s b
                      WHERE b.table_name = %1$L AND b.column_name = %4$L AND b.row_key = s.%2$I::text AND b.new_value = s.%3$I::text),
                    (SELECT n.nm FROM tmp_20261026_010_name n WHERE n.kind = %6$L AND n.cd = s.%3$I::text),
                    s.%3$I)
            WHERE NULLIF(s.%3$I::text, '') IS NOT NULL
        $q$, tbl, keycol, newcol, oldcol,
             CASE WHEN has_backup THEN 'public.bak_20261026_010_by_values' ELSE 'bak_20261026_010_by_values_empty' END, kind);
    END LOOP;

    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; oldcol := spec[i][3]; newcol := spec[i][4];
        IF newcol <> oldcol AND EXISTS (SELECT 1 FROM information_schema.columns
                                         WHERE table_schema = 'public' AND table_name = tbl AND column_name = newcol) THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', tbl, newcol, oldcol);
        END IF;
    END LOOP;
END $$;

COMMIT;
