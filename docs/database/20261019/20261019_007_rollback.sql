-- 20261019_007_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_007 되돌리기 — employees.id 를 숫자 자동번호로, emp_no 칸을 되살리고, 사원 번호 칸 16개를 integer 로 되돌린다.
-- 주의
--   - 코드(로그인 · 인사 · 문서함 · 레시피 · 포장유형 · 창고)도 함께 되돌려야 한다.
--   - 바꾼 뒤 새로 만든 사원(8자리 사번)은 옛 번호가 없어서 지금 가장 큰 번호 다음부터 새 번호를 받는다. 그 사번은 emp_no 에 남는다.
--   - 포장유형 · 창고의 등록자 · 수정자 칸은 원래 사번을 담으므로 바꾸지 않는다.
--   - 되살린 emp_no 는 표의 맨 끝 칸으로 붙는다(내부 칸 번호만 달라지고 쓰임은 같다).

BEGIN;

DO $$
DECLARE
    ref RECORD;
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'id') = 'integer' THEN
        RAISE NOTICE 'employees.id 는 이미 숫자다. 건너뛴다';
        RETURN;
    END IF;

    -- 새 사번 → 옛 번호 짝(백업에 없는 새 사원은 가장 큰 번호 다음부터)
    CREATE TEMP TABLE tmp_emp_map ON COMMIT DROP AS
    SELECT b.new_id, b.old_id FROM bak_20261019_007_employees_id b;
    INSERT INTO tmp_emp_map (new_id, old_id)
    SELECT e.id, COALESCE((SELECT MAX(old_id) FROM tmp_emp_map), 0) + ROW_NUMBER() OVER (ORDER BY e.id)
    FROM employees e
    WHERE e.id NOT IN (SELECT new_id FROM tmp_emp_map);

    -- 사원 번호 칸: 옛 번호로 되돌리고 숫자형으로
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
            WHERE table_schema = 'public' AND table_name = ref.tbl AND column_name = ref.col) = 'character varying' THEN
            EXECUTE format('UPDATE %I t SET %I = m.old_id::text FROM tmp_emp_map m WHERE t.%I = m.new_id', ref.tbl, ref.col, ref.col);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE INTEGER USING %I::integer', ref.tbl, ref.col, ref.col);
        END IF;
    END LOOP;

    -- 사원 표: emp_no 되살리고 id 를 옛 번호로
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS emp_no VARCHAR(20);
    UPDATE employees e
    SET emp_no = CASE WHEN b.old_id IS NOT NULL THEN b.emp_no ELSE e.id END
    FROM tmp_emp_map m
    LEFT JOIN bak_20261019_007_employees_id b ON b.new_id = m.new_id
    WHERE e.id = m.new_id;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_emp_no ON employees (emp_no) WHERE emp_no IS NOT NULL;
    UPDATE employees e SET id = m.old_id::text FROM tmp_emp_map m WHERE e.id = m.new_id;
    ALTER TABLE employees ALTER COLUMN id TYPE INTEGER USING id::integer;
    CREATE SEQUENCE IF NOT EXISTS employees_id_seq OWNED BY employees.id;
    PERFORM setval('employees_id_seq', COALESCE((SELECT MAX(id) FROM employees), 0) + 1, false);
    ALTER TABLE employees ALTER COLUMN id SET DEFAULT nextval('employees_id_seq');
    COMMENT ON COLUMN employees.id IS NULL;

    DROP TABLE bak_20261019_007_employees_id;
END
$$;

-- 새 사번 번호표
DELETE FROM tb_id_sequence WHERE generator_key = 'EMPLOYEE_ID' AND scope_key_1 = 'ALL' AND scope_key_2 = 'ALL';

COMMIT;
