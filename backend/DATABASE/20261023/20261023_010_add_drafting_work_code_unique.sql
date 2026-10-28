-- 20261023_010_add_drafting_work_code_unique.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 기안양식관리 [저장] 오류 수정(2026-10-23, 사용자 화면 "데이터 처리 중 오류가 발생했습니다")
--   기안양식 등록 쿼리(DraftingWork_SQL_postgresql.xml insertWork)는
--   ON CONFLICT (tenant_id, cata_type_code) WHERE delete_status IS DISTINCT FROM 'Y' 를 쓴다.
--   그런데 송연 DB 에는 여기에 맞는 고유 인덱스가 없어 등록이 늘 실패했다.
--   S_ERP 20261002_002_drafting_work_code_unique 와 같은 인덱스를 만든다(그룹웨어 이관 때 빠졌다).
--   - 삭제 처리되지 않은 양식 코드는 테넌트 안에서 하나만(use_at = 'N' 도 코드를 차지한다)
--   - 중복이 있으면 자동으로 고치지 않고 멈춘다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_drafting_work_category
        WHERE delete_status IS DISTINCT FROM 'Y'
        GROUP BY tenant_id, cata_type_code
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate active drafting work codes exist; resolve them before creating the unique index.';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_drafting_work_category_tenant_cata_type
    ON public.tb_drafting_work_category (tenant_id, cata_type_code)
    WHERE delete_status IS DISTINCT FROM 'Y';

COMMIT;
