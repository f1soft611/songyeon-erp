-- 20261026_011_label_by_employee_id.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 라벨 버전 · 라벨 요청의 '누가' 칸을 직원 이름이 아니라 사번(employees.id)으로 저장(2026-10-26 요청
--       "product_label_versions 여기 테이블에 created_by 값이 안 들어가는거 같아", 사용자 결정: 사번으로 채우기)
--   - product_label_versions.created_by · updated_by, label_requests.updated_by (이름 그대로) : 직원 이름 → 사번
--   - 같은 이름의 직원이 여럿이면 사번이 작은 것. 칸 이름 · 자리 · 형식(text)은 그대로. 빈 값 · 이미 사번인 값은 건너뛴다.
--   - 비어 있는 created_by(예전 v1 자동 생성 때 안 채운 것)는 누가 만들었는지 몰라 그대로 둔다.
--   - 직원 목록에 없는 이름이 있으면 바꾸지 않고 멈춘다.
--   - 롤백이 정확하도록 바꾸는 값을 bak_20261026_011_label_by 에 남긴다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
DECLARE
    -- 표, 줄 열쇠, 칸, 칸, 종류
    spec text[][] := ARRAY[
        ARRAY['product_label_versions', 'id', 'created_by', 'created_by', 'employee'],
        ARRAY['product_label_versions', 'id', 'updated_by', 'updated_by', 'employee'],
        ARRAY['label_requests', 'id', 'updated_by', 'updated_by', 'employee']];
    i int;
    tbl text; keycol text; oldcol text; newcol text; kind text;
    bad int;
BEGIN
    IF to_regclass('public.bak_20261026_011_label_by') IS NULL THEN
        CREATE TABLE public.bak_20261026_011_label_by (
            table_name text NOT NULL,
            column_name text NOT NULL,
            row_key text NOT NULL,
            old_value text,
            new_value text,
            PRIMARY KEY (table_name, column_name, row_key)
        );
    END IF;

    DROP TABLE IF EXISTS pg_temp.tmp_20261026_011_map;
    CREATE TEMP TABLE tmp_20261026_011_map ON COMMIT DROP AS
    SELECT 'client'::text AS kind, c.name AS nm, c.client_code AS cd,
           row_number() OVER (PARTITION BY c.name ORDER BY c.client_code) AS rn
    FROM public.clients c
    WHERE NULLIF(c.client_code, '') IS NOT NULL AND c.name IS NOT NULL
    UNION ALL
    SELECT 'employee', e.name, e.id, row_number() OVER (PARTITION BY e.name ORDER BY e.id)
    FROM public.employees e
    WHERE e.name IS NOT NULL;

    -- 먼저 다 확인한다(하나라도 없으면 아무것도 바꾸지 않는다)
    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; oldcol := spec[i][3]; kind := spec[i][5];
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = tbl AND column_name = oldcol) THEN
            CONTINUE; -- 이미 이름이 바뀌었다
        END IF;
        EXECUTE format($q$
            SELECT count(*) FROM public.%1$I s
            WHERE NULLIF(s.%2$I::text, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_011_map m WHERE m.kind = %3$L AND m.cd = s.%2$I::text)
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_011_map m WHERE m.kind = %3$L AND m.nm = s.%2$I::text)
        $q$, tbl, oldcol, kind) INTO bad;
        IF bad > 0 THEN
            RAISE EXCEPTION '%.% 에 마스터 · 직원 목록에 없는 값이 % 건 있습니다. 먼저 정리하세요.', tbl, oldcol, bad;
        END IF;
    END LOOP;

    FOR i IN 1 .. array_length(spec, 1) LOOP
        tbl := spec[i][1]; keycol := spec[i][2]; oldcol := spec[i][3]; newcol := spec[i][4]; kind := spec[i][5];
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = tbl AND column_name = oldcol) THEN
            CONTINUE;
        END IF;
        EXECUTE format($q$
            INSERT INTO public.bak_20261026_011_label_by (table_name, column_name, row_key, old_value, new_value)
            SELECT %1$L, %3$L, s.%2$I::text, s.%3$I::text, m.cd
            FROM public.%1$I s
            JOIN tmp_20261026_011_map m ON m.kind = %4$L AND m.nm = s.%3$I::text AND m.rn = 1
            WHERE NULLIF(s.%3$I::text, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_011_map k WHERE k.kind = %4$L AND k.cd = s.%3$I::text)
            ON CONFLICT DO NOTHING
        $q$, tbl, keycol, oldcol, kind);
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET %2$I = m.cd
            FROM tmp_20261026_011_map m
            WHERE m.kind = %3$L AND m.nm = s.%2$I::text AND m.rn = 1
              AND NULLIF(s.%2$I::text, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_011_map k WHERE k.kind = %3$L AND k.cd = s.%2$I::text)
        $q$, tbl, oldcol, kind);
        IF newcol <> oldcol THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', tbl, oldcol, newcol);
        END IF;
    END LOOP;
END $$;

COMMIT;
