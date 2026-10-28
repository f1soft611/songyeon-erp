-- 20261002_008_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_008 되돌리기 — 관리자 계정의 로그인 아이디를 '0000' → '관리자' 로 되돌린다.

BEGIN;

UPDATE employees
SET username = '관리자'
WHERE id = 1
  AND username = '0000'
  AND NOT EXISTS (SELECT 1 FROM employees WHERE username = '관리자');

COMMIT;
