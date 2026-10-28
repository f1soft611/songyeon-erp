BEGIN;

DO $$
DECLARE
    category_group_count BIGINT;
    work_count BIGINT;
    authority_count BIGINT;
BEGIN
    IF TO_REGCLASS('public.tb_drafting_work_category_group') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.tb_drafting_work_category_group'
            INTO category_group_count;
        IF category_group_count > 0 THEN
            RAISE EXCEPTION 'Rollback stopped: tb_drafting_work_category_group contains data';
        END IF;
    END IF;
    IF TO_REGCLASS('public.tb_drafting_work_category') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.tb_drafting_work_category'
            INTO work_count;
        IF work_count > 0 THEN
            RAISE EXCEPTION 'Rollback stopped: tb_drafting_work_category contains data';
        END IF;
    END IF;
    IF TO_REGCLASS('public.tb_drafting_work_category_authority') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.tb_drafting_work_category_authority'
            INTO authority_count;
        IF authority_count > 0 THEN
            RAISE EXCEPTION 'Rollback stopped: tb_drafting_work_category_authority contains data';
        END IF;
    END IF;
END $$;

DROP TABLE IF EXISTS public.tb_drafting_work_category_authority RESTRICT;
DROP TABLE IF EXISTS public.tb_drafting_work_category RESTRICT;
DROP TABLE IF EXISTS public.tb_drafting_work_category_group RESTRICT;

DELETE FROM public.tb_common_code_item i
USING public.tb_common_code_group g
WHERE i.group_id = g.common_code_group_id
  AND g.group_code = 'WF_FORM_CYCLE'
  AND i.item_code IN ('DAY', 'WEEK', 'MONTH', 'EVENT')
  AND i.item_dc = '기안양식 등록주기 공통코드 (20261001_001)';

DELETE FROM public.tb_common_code_group g
WHERE g.group_code IN ('WF_FORM_CATEGORY', 'WF_FORM_CYCLE')
  AND g.group_dc IN (
      '기안양식 분류 공통코드 (20261001_001)',
      '기안양식 등록주기 공통코드 (20261001_001)'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_common_code_item i
      WHERE i.group_id = g.common_code_group_id
  );

COMMIT;