-- 20261019_002_migrate_box_type_user_to_emp_no.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: tb_box_type 의 등록자 · 수정자(reg_user_id · upd_user_id)를 로그인 아이디(employees.username)에서 사번(employees.emp_no)으로 바꾼다.
--       앞으로는 서비스가 사번을 넣고, 조회할 때 사원 표와 사번으로 이어 붙여 이름을 보여준다.
--       2026-10-19 화면 저장 때 로그인 아이디가 들어간 줄을 바로잡는다. 사원 표에 없는 값(샘플의 'admin')은 그대로 둔다.
-- 수정일시(upd_dt)는 바꾸지 않는다: BEFORE UPDATE 트리거(tg_box_type_upd)가 now() 로 덮으므로 이 작업 동안만 끈다.
-- 되돌리기용으로 바꾸기 전 값을 bak_20261019_002_box_type_user 에 남긴다.

BEGIN;

CREATE TABLE IF NOT EXISTS bak_20261019_002_box_type_user (
    box_type_id  BIGINT PRIMARY KEY,
    reg_user_id  VARCHAR(20),
    upd_user_id  VARCHAR(20),
    backed_up_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO bak_20261019_002_box_type_user (box_type_id, reg_user_id, upd_user_id)
SELECT b.box_type_id, b.reg_user_id, b.upd_user_id
FROM tb_box_type b
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.emp_no IS NOT NULL AND e.username IN (b.reg_user_id, b.upd_user_id))
ON CONFLICT (box_type_id) DO NOTHING;

ALTER TABLE tb_box_type DISABLE TRIGGER tg_box_type_upd;

UPDATE tb_box_type b
SET reg_user_id = e.emp_no
FROM employees e
WHERE e.username = b.reg_user_id
  AND e.emp_no IS NOT NULL;

UPDATE tb_box_type b
SET upd_user_id = e.emp_no
FROM employees e
WHERE e.username = b.upd_user_id
  AND e.emp_no IS NOT NULL;

ALTER TABLE tb_box_type ENABLE TRIGGER tg_box_type_upd;

COMMIT;
