-- 20261002_009_add_employee_emp_no.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 직원번호(emp_no, 글자) 칸을 더하고 관리자(id 1)에 '0000' 을 넣는다.
--       로그인할 때 직원번호('0000') 또는 기존 로그인 아이디(username '관리자') 둘 다로 로그인한다.
--       id(숫자)·username 은 그대로 두어 같은 DB 를 쓰는 송연 원본 프로그램에 영향이 없다.

BEGIN;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS emp_no VARCHAR(20);

COMMENT ON COLUMN employees.emp_no IS '직원번호(글자, 앞자리 0 유지). 로그인 아이디로도 쓴다';

-- 직원번호는 겹치지 않게(비어 있는 직원은 여럿 가능)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_emp_no ON employees (emp_no) WHERE emp_no IS NOT NULL;

UPDATE employees
SET emp_no = '0000'
WHERE id = 1
  AND emp_no IS NULL
  AND NOT EXISTS (SELECT 1 FROM employees WHERE emp_no = '0000');

COMMIT;
