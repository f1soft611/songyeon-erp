-- 20261026_012_label_storage_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 라벨 버전 · 라벨 요청의 보관방법을 라벨 글자가 아니라 공통코드 STORAGE_METHOD 코드로 저장(2026-10-26 요청
--       "product_label_versions 테이블에 \"storage\"이것도 코드값으로 들어가야될듯", 사용자 결정: 공통코드에서만 고르기)
--   - product_label_versions.storage, label_requests.storage (칸 이름 · 자리 · 형식 text 그대로)
--   - 값: 코드면 그대로, 공통코드 이름과 같으면 그 코드, 아니면 글자에 든 앞말(실온 · 냉장 · 냉동)로 찾은 코드
--     (예: '냉장보관(0℃~10℃)' → 냉장 코드). 서버 저장 규칙과 같다.
--   - 빈 값은 그대로. 어느 코드와도 맞지 않는 글자가 있으면 바꾸지 않고 멈춘다.
--   - 롤백이 정확하도록 바꾸는 값을 bak_20261026_012_label_storage 에 남긴다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
DECLARE
    tbl text;
    bad int;
BEGIN
    IF to_regclass('public.bak_20261026_012_label_storage') IS NULL THEN
        CREATE TABLE public.bak_20261026_012_label_storage (
            table_name text NOT NULL,
            row_id integer NOT NULL,
            old_value text,
            new_value text,
            PRIMARY KEY (table_name, row_id)
        );
    END IF;

    DROP TABLE IF EXISTS pg_temp.tmp_20261026_012_sm;
    CREATE TEMP TABLE tmp_20261026_012_sm ON COMMIT DROP AS
    SELECT i.item_code AS cd, i.item_nm AS nm, split_part(i.item_nm, '(', 1) AS head, i.sort_order AS so
    FROM public.tb_common_code_item i
    JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
    JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON';

    FOREACH tbl IN ARRAY ARRAY['product_label_versions', 'label_requests'] LOOP
        EXECUTE format($q$
            SELECT count(*) FROM public.%1$I s
            WHERE NULLIF(s.storage, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM tmp_20261026_012_sm m
                              WHERE m.cd = s.storage OR m.nm = s.storage OR (m.head <> '' AND strpos(s.storage, m.head) > 0))
        $q$, tbl) INTO bad;
        IF bad > 0 THEN
            RAISE EXCEPTION '%.storage 에 공통코드 STORAGE_METHOD 와 맞지 않는 값이 % 건 있습니다. 먼저 정리하세요.', tbl, bad;
        END IF;
    END LOOP;

    FOREACH tbl IN ARRAY ARRAY['product_label_versions', 'label_requests'] LOOP
        EXECUTE format($q$
            WITH pick AS (
                SELECT s.id, s.storage AS old_value,
                       (SELECT m.cd FROM tmp_20261026_012_sm m
                         WHERE m.cd = s.storage OR m.nm = s.storage OR (m.head <> '' AND strpos(s.storage, m.head) > 0)
                         ORDER BY CASE WHEN m.cd = s.storage THEN 0 WHEN m.nm = s.storage THEN 1 ELSE 2 END, m.so, m.cd
                         LIMIT 1) AS new_value
                FROM public.%1$I s
                WHERE NULLIF(s.storage, '') IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM tmp_20261026_012_sm k WHERE k.cd = s.storage)
            ), saved AS (
                INSERT INTO public.bak_20261026_012_label_storage (table_name, row_id, old_value, new_value)
                SELECT %1$L, id, old_value, new_value FROM pick
                ON CONFLICT DO NOTHING
            )
            UPDATE public.%1$I s SET storage = p.new_value FROM pick p WHERE p.id = s.id
        $q$, tbl);
    END LOOP;
END $$;

COMMIT;
