-- 20261026_012_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_012 를 되돌린다: 라벨 버전 · 라벨 요청의 보관방법 코드 → 글자.
--   - 백업 표(bak_20261026_012_label_storage)에 있고 값이 바꾼 코드 그대로인 줄은 백업의 예전 글자로 되돌린다.
--   - 적용 뒤 새로 넣은 줄(코드)은 공통코드 이름을 넣는다.
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(라벨 매퍼)와 화면(라벨등록 보관방법 고르기)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
DECLARE
    tbl text;
    has_backup boolean := to_regclass('public.bak_20261026_012_label_storage') IS NOT NULL;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['product_label_versions', 'label_requests'] LOOP
        IF has_backup THEN
            EXECUTE format($q$
                UPDATE public.%1$I s SET storage = b.old_value
                FROM public.bak_20261026_012_label_storage b
                WHERE b.table_name = %1$L AND b.row_id = s.id AND b.new_value = s.storage
            $q$, tbl);
        END IF;
        EXECUTE format($q$
            UPDATE public.%1$I s
            SET storage = i.item_nm
            FROM public.tb_common_code_item i
            JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
            JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
            WHERE i.item_code = s.storage
        $q$, tbl);
    END LOOP;
END $$;

COMMIT;
