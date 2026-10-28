-- 20261026_009_receiving_warehouse_codes.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 입고 거래처 · 과세구분과 창고를 코드로 저장(2026-10-26 요청 "material_receiving테이블의 client_name,warehouse,tax_type 이거 코드값으로 바꿔야할듯",
--       사용자 결정: 창고 칸 모두 코드로, 칸 이름도 바꾸고, DB 는 Claude 가 스크립트로)
--   칸(이름 바꿈 → 값)
--   - material_receiving.client_name → client_code : 거래처명 → 거래처마스터 거래처코드(같은 이름이 여럿이면 코드가 작은 것)
--   - material_receiving.warehouse → warehouse_cd : 창고명 → 창고마스터(tb_warehouse, 사업장 F001/P001) 창고코드
--   - material_receiving.tax_type(이름 그대로)      : 과세구분 이름 → 공통코드 TAX_CATEGORY 코드(과세 001 · 면세 002)
--   - materials.warehouse → warehouse_cd(원재료 기본창고), material_stock_schedule.warehouse → warehouse_cd(재고조정),
--     material_warehouse_move.from_warehouse → from_warehouse_cd, to_warehouse → to_warehouse_cd(창고이동) : 창고명 → 창고코드
--   - 칸 자리 · 형식(text)은 그대로. 빈 값은 그대로. 이미 코드인 값은 건너뛴다.
--   - 마스터 · 공통코드에 없는 값이 있으면 바꾸지 않고 멈춘다.
--   - 롤백이 정확하도록 바꾸는 값을 bak_20261026_009_code_values 에 남긴다(표 · 칸 · 줄 · 예전 값 · 새 값).
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
DECLARE
    -- 표, 줄 열쇠, 예전 칸, 새 칸, 종류
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
    bad int;
BEGIN
    IF to_regclass('public.bak_20261026_009_code_values') IS NULL THEN
        CREATE TABLE public.bak_20261026_009_code_values (
            table_name text NOT NULL,
            column_name text NOT NULL,
            row_key text NOT NULL,
            old_value text,
            new_value text,
            PRIMARY KEY (table_name, column_name, row_key)
        );
    END IF;

    -- 이름 → 코드 표(종류별). 같은 이름이 여럿이면 첫 줄(rn = 1)
    DROP TABLE IF EXISTS pg_temp.tmp_20261026_009_map;
    CREATE TEMP TABLE tmp_20261026_009_map ON COMMIT DROP AS
    SELECT 'client'::text AS kind, c.name AS nm, c.client_code AS cd,
           row_number() OVER (PARTITION BY c.name ORDER BY c.client_code) AS rn
    FROM public.clients c
    WHERE NULLIF(c.client_code, '') IS NOT NULL AND c.name IS NOT NULL
    UNION ALL
    SELECT 'warehouse', w.warehouse_nm, w.warehouse_cd,
           row_number() OVER (PARTITION BY w.warehouse_nm ORDER BY CASE WHEN w.use_yn = 'Y' THEN 0 ELSE 1 END, w.warehouse_id)
    FROM public.tb_warehouse w
    WHERE w.factory_code = 'F001' AND w.plant_code = 'P001'
    UNION ALL
    SELECT 'tax', i.item_nm, i.item_code,
           row_number() OVER (PARTITION BY i.item_nm ORDER BY CASE WHEN i.use_at = 'Y' THEN 0 ELSE 1 END, i.sort_order, i.item_code)
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'TAX_CATEGORY'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON';

    -- 먼저 다 확인한다(하나라도 없으면 아무것도 바꾸지 않는다)
    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; keycol := spec[i][2]; oldcol := spec[i][3]; newcol := spec[i][4]; kind := spec[i][5];
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = tbl AND column_name = oldcol) THEN
            CONTINUE; -- 이미 바뀌었다(이름이 같은 tax_type 은 아래에서 값으로 본다)
        END IF;
        EXECUTE format($q$
            SELECT count(*) FROM public.%1$I s
            WHERE NULLIF(s.%2$I, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_009_map m WHERE m.kind = %3$L AND m.cd = s.%2$I)
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_009_map m WHERE m.kind = %3$L AND m.nm = s.%2$I)
        $q$, tbl, oldcol, kind) INTO bad;
        IF bad > 0 THEN
            RAISE EXCEPTION '%.% 에 마스터 · 공통코드에 없는 값이 % 건 있습니다. 먼저 정리하세요.', tbl, oldcol, bad;
        END IF;
    END LOOP;

    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; keycol := spec[i][2]; oldcol := spec[i][3]; newcol := spec[i][4]; kind := spec[i][5];
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = tbl AND column_name = oldcol) THEN
            CONTINUE;
        END IF;
        EXECUTE format($q$
            INSERT INTO public.bak_20261026_009_code_values (table_name, column_name, row_key, old_value, new_value)
            SELECT %1$L, %3$L, s.%2$I::text, s.%3$I, m.cd
            FROM public.%1$I s
            JOIN tmp_20261026_009_map m ON m.kind = %4$L AND m.nm = s.%3$I AND m.rn = 1
            WHERE NULLIF(s.%3$I, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_009_map k WHERE k.kind = %4$L AND k.cd = s.%3$I)
            ON CONFLICT DO NOTHING
        $q$, tbl, keycol, oldcol, kind);
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET %2$I = m.cd
            FROM tmp_20261026_009_map m
            WHERE m.kind = %3$L AND m.nm = s.%2$I AND m.rn = 1
              AND NULLIF(s.%2$I, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_009_map k WHERE k.kind = %3$L AND k.cd = s.%2$I)
        $q$, tbl, oldcol, kind);
        IF newcol <> oldcol THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', tbl, oldcol, newcol);
        END IF;
    END LOOP;
END $$;

COMMIT;
