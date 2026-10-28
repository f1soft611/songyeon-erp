-- 20261002_009_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_009 되돌리기 — 직원번호 칸과 색인을 지운다(넣어 둔 직원번호도 함께 지워짐).

BEGIN;

DROP INDEX IF EXISTS idx_employees_emp_no;

ALTER TABLE employees DROP COLUMN IF EXISTS emp_no;

COMMIT;
