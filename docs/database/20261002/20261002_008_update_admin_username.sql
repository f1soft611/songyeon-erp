-- 20261002_008_update_admin_username.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 관리자 계정의 로그인 아이디(employees.username)를 '관리자' → '0000' 으로 바꾼다(사용자 요청).
--       이름(employees.name)은 '관리자' 그대로 둔다. 비밀번호는 바꾸지 않는다.

BEGIN;

UPDATE employees
SET username = '0000'
WHERE id = 1
  AND username = '관리자'
  AND NOT EXISTS (SELECT 1 FROM employees WHERE username = '0000');

COMMIT;
