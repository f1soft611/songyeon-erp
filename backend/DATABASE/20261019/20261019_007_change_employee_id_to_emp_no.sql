-- 20261019_007_change_employee_id_to_emp_no.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 사원 표 employees 의 id 를 사번(글자, 예: '0000')으로 바꾸고 emp_no 칸을 없앤다(2026-10-19 사용자 요청).
--   - employees.id: integer(자동번호 employees_id_seq) → varchar(20). 값은 emp_no(있으면) 또는 옛 id 를 8자리로 채운 값(예: 1 → 00000001)
--   - 새 사원 사번은 서버가 8자리 자동 번호로 매긴다(번호표 tb_id_sequence 키 EMPLOYEE_ID · ALL · ALL). 자동번호 시퀀스는 지운다.
--   - 사원 번호를 담는 다른 표의 칸 16개도 integer → varchar(20) 로 바꾸고, 담긴 옛 번호를 새 사번으로 옮긴다.
--   - 옛 id ↔ 새 사번 짝은 백업 표 bak_20261019_007_employees_id 에 남긴다(롤백이 쓴다).
-- 다시 돌려도 안전하다: employees.id 가 이미 글자형이면 아무것도 하지 않는다.

BEGIN;

CREATE TABLE IF NOT EXISTS bak_20261019_007_employees_id (
    old_id    INTEGER     PRIMARY KEY,
    emp_no    VARCHAR(20),
    new_id    VARCHAR(20) NOT NULL UNIQUE,
    backup_dt TIMESTAMP   NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
    ref RECORD;
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'id') <> 'integer' THEN
        RAISE NOTICE 'employees.id 는 이미 바뀌었다. 건너뛴다';
        RETURN;
    END IF;

    -- 1) 옛 번호 ↔ 새 사번 짝
    INSERT INTO bak_20261019_007_employees_id (old_id, emp_no, new_id)
    SELECT id, emp_no, COALESCE(NULLIF(TRIM(emp_no), ''), LPAD(id::text, 8, '0'))
    FROM employees
    ON CONFLICT (old_id) DO NOTHING;

    -- 2) 사원 표: 자동번호를 떼고 글자형 사번으로
    ALTER TABLE employees ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE employees ALTER COLUMN id TYPE VARCHAR(20)
        USING COALESCE(NULLIF(TRIM(emp_no), ''), LPAD(id::text, 8, '0'));
    DROP SEQUENCE IF EXISTS employees_id_seq;
    ALTER TABLE employees DROP COLUMN IF EXISTS emp_no;   -- 사번 유일 인덱스 idx_employees_emp_no 도 함께 없어진다(id 가 PK 라 유일)
    COMMENT ON COLUMN employees.id IS '사번(PK, 예: 0000. 새 사원은 8자리 자동 번호)';

    -- 3) 사원 번호를 담는 칸: 글자형으로 바꾸고 옛 번호를 새 사번으로
    FOR ref IN
        SELECT * FROM (VALUES
            ('chat_messages', 'sender_id'),
            ('chat_room_members', 'employee_id'),
            ('chat_rooms', 'created_by'),
            ('client_payments', 'created_by'),
            ('dashboard_memos', 'created_by'),
            ('document_folder', 'owner_id'),
            ('document_share', 'shared_by'),
            ('document_share', 'to_employee_id'),
            ('leave_records', 'employee_id'),
            ('recipe_clients', 'created_by'),
            ('recipe_clients', 'sales_emp_id'),
            ('recipe_drafts', 'created_by'),
            ('recipe_handoffs', 'requested_by'),
            ('recipe_shares', 'created_by'),
            ('recipe_shares', 'employee_id'),
            ('recipe_stage_logs', 'employee_id')
        ) AS v(tbl, col)
    LOOP
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ref.tbl AND column_name = ref.col) = 'integer' THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR(20) USING %I::text', ref.tbl, ref.col, ref.col);
            EXECUTE format('UPDATE %I t SET %I = b.new_id FROM bak_20261019_007_employees_id b WHERE t.%I = b.old_id::text',
                           ref.tbl, ref.col, ref.col);
        END IF;
    END LOOP;
END
$$;

COMMIT;
