-- 20261023_010_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_010 되돌리기 — 기안양식 코드 고유 인덱스만 지운다(표 · 자료는 그대로).
-- 주의: 지우면 기안양식 등록(insertWork 의 ON CONFLICT)이 다시 실패한다.

BEGIN;

DROP INDEX IF EXISTS public.uq_drafting_work_category_tenant_cata_type;

COMMIT;
