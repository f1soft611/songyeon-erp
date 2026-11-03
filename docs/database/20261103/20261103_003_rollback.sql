-- 20261103_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261103_003_employee_id_unify.sql 되돌리기
--   - 사번 칸을 다시 숫자(bigint) 번호로 바꾸고 자동 번호 · 옛 FK 를 되살린다
--   - 옛 번호(바꾸기 전 값)는 남아 있지 않아 번호를 새로 매긴다: 계정 · 사용자 모두 사번 순서대로 1, 2, …
--   - 사람 칸은 그 새 번호로 바꾼다. 바꿀 수 없는 사번이 하나라도 있으면 멈춘다
--   - 화면 · 서버 코드도 함께 돌려야 한다

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'tb_login_account' AND column_name = 'login_id' AND data_type = 'bigint') THEN
        RAISE EXCEPTION 'tb_login_account.login_id 가 이미 숫자다(되돌릴 것이 없다)';
    END IF;
END $$;

-- 1. 사번 → 새 번호 표
DROP TABLE IF EXISTS pg_temp.rb_map_login;
CREATE TEMP TABLE rb_map_login AS
SELECT la.login_id AS emp_id, ROW_NUMBER() OVER (ORDER BY la.login_id) AS new_id
FROM tb_login_account la;

DROP TABLE IF EXISTS pg_temp.rb_map_user;
CREATE TEMP TABLE rb_map_user AS
SELECT u.user_id AS emp_id, ROW_NUMBER() OVER (ORDER BY u.user_id) AS new_id
FROM tb_user u;

CREATE OR REPLACE FUNCTION pg_temp.rb_login(v text)
RETURNS bigint AS $$
    SELECT m.new_id FROM pg_temp.rb_map_login m WHERE m.emp_id = v
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION pg_temp.rb_user(v text)
RETURNS bigint AS $$
    SELECT m.new_id FROM pg_temp.rb_map_user m WHERE m.emp_id = v
$$ LANGUAGE sql STABLE;

-- 2. 바꿀 수 없는 사번 검사
DO $$
DECLARE
    n bigint;
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('tb_user', 'login_id', 'login'),
            ('tb_login_account_role', 'login_id', 'login'),
            ('tb_electronic_approval_line_info', 'participant_user_id', 'user'),
            ('tb_electronic_approval_line_template_info', 'participant_user_id', 'user'),
            ('tb_electronic_approval_pin', 'user_id', 'user'),
            ('tb_electronic_approval_view_history', 'login_id', 'login'),
            ('tb_board_post_view_history', 'login_id', 'login'),
            ('tb_notice_popup_dismissal', 'login_id', 'login'),
            ('tb_drafting_work_category', 'approver_id', 'login'),
            ('tb_drafting_work_category', 'reviewer_id', 'login'),
            ('tb_drafting_work_category', 'created_by', 'login'),
            ('tb_drafting_work_category', 'updated_by', 'login'),
            ('tb_drafting_work_category_authority', 'employee_no', 'user'),
            ('tb_drafting_work_category_authority', 'created_by', 'login'),
            ('tb_drafting_work_category_authority', 'updated_by', 'login'),
            ('tb_drafting_work_category_group', 'created_by', 'login'),
            ('tb_drafting_work_category_group', 'updated_by', 'login'),
            ('tb_common_code_group', 'created_by', 'login'),
            ('tb_common_code_group', 'updated_by', 'login'),
            ('tb_common_code_item', 'created_by', 'login'),
            ('tb_common_code_item', 'updated_by', 'login'),
            ('tb_tenant', 'created_by', 'login')
        ) AS t(tbl, col, kind)
    LOOP
        EXECUTE format('SELECT count(*) FROM %I WHERE %I IS NOT NULL AND pg_temp.rb_%s(%I) IS NULL',
                       r.tbl, r.col, r.kind, r.col) INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION '%.% 에 번호로 바꿀 수 없는 사번이 % 줄 있다', r.tbl, r.col, n;
        END IF;
    END LOOP;
END $$;

-- 3. 이 작업이 건 FK 삭제
ALTER TABLE tb_user DROP CONSTRAINT IF EXISTS tb_user_login_id_fkey;
ALTER TABLE tb_login_account_role DROP CONSTRAINT IF EXISTS tb_login_account_role_login_id_fkey;
ALTER TABLE tb_login_account DROP CONSTRAINT IF EXISTS fk_tb_login_account_login_id_emp;
ALTER TABLE tb_user DROP CONSTRAINT IF EXISTS fk_tb_user_user_id_emp;
ALTER TABLE tb_electronic_approval_line_info DROP CONSTRAINT IF EXISTS fk_electronic_approval_line_info_participant_emp;
ALTER TABLE tb_electronic_approval_line_template_info DROP CONSTRAINT IF EXISTS fk_electronic_approval_line_template_info_participant_emp;
ALTER TABLE tb_electronic_approval_pin DROP CONSTRAINT IF EXISTS fk_electronic_approval_pin_emp;
ALTER TABLE tb_electronic_approval_view_history DROP CONSTRAINT IF EXISTS fk_electronic_approval_view_history_emp;
ALTER TABLE tb_board_post_view_history DROP CONSTRAINT IF EXISTS fk_board_post_view_history_emp;
ALTER TABLE tb_notice_popup_dismissal DROP CONSTRAINT IF EXISTS fk_notice_popup_dismissal_emp;
ALTER TABLE tb_drafting_work_category DROP CONSTRAINT IF EXISTS fk_drafting_work_category_approver_emp;
ALTER TABLE tb_drafting_work_category DROP CONSTRAINT IF EXISTS fk_drafting_work_category_reviewer_emp;
ALTER TABLE tb_drafting_work_category_authority DROP CONSTRAINT IF EXISTS fk_drafting_work_category_authority_employee_emp;
ALTER TABLE tb_screen_review DROP CONSTRAINT IF EXISTS fk_screen_review_reviewer_emp;
ALTER TABLE tb_screen_review_history DROP CONSTRAINT IF EXISTS fk_screen_review_history_reviewer_emp;
ALTER TABLE tb_screen_review_draft DROP CONSTRAINT IF EXISTS fk_screen_review_draft_writer_emp;

-- 4. 형식 · 값 되돌리기
ALTER TABLE tb_login_account ALTER COLUMN login_id TYPE bigint USING pg_temp.rb_login(login_id);
ALTER TABLE tb_login_account ALTER COLUMN login_id ADD GENERATED BY DEFAULT AS IDENTITY;
SELECT setval(pg_get_serial_sequence('tb_login_account', 'login_id'), COALESCE((SELECT MAX(login_id) FROM tb_login_account), 0) + 1, false);
ALTER TABLE tb_user ALTER COLUMN user_id TYPE bigint USING pg_temp.rb_user(user_id);
ALTER TABLE tb_user ALTER COLUMN user_id ADD GENERATED BY DEFAULT AS IDENTITY;
SELECT setval(pg_get_serial_sequence('tb_user', 'user_id'), COALESCE((SELECT MAX(user_id) FROM tb_user), 0) + 1, false);
ALTER TABLE tb_user ALTER COLUMN login_id TYPE bigint USING pg_temp.rb_login(login_id);
ALTER TABLE tb_login_account_role ALTER COLUMN login_id TYPE bigint USING pg_temp.rb_login(login_id);

ALTER TABLE tb_electronic_approval_line_info ALTER COLUMN participant_user_id TYPE varchar(100) USING CAST(pg_temp.rb_user(participant_user_id) AS varchar);
ALTER TABLE tb_electronic_approval_line_template_info ALTER COLUMN participant_user_id TYPE varchar(100) USING CAST(pg_temp.rb_user(participant_user_id) AS varchar);
ALTER TABLE tb_electronic_approval_pin ALTER COLUMN user_id TYPE bigint USING pg_temp.rb_user(user_id);
ALTER TABLE tb_electronic_approval_view_history ALTER COLUMN login_id TYPE bigint USING pg_temp.rb_login(login_id);
ALTER TABLE tb_board_post_view_history ALTER COLUMN login_id TYPE bigint USING pg_temp.rb_login(login_id);
ALTER TABLE tb_notice_popup_dismissal ALTER COLUMN login_id TYPE bigint USING pg_temp.rb_login(login_id);

ALTER TABLE tb_drafting_work_category
    ALTER COLUMN approver_id TYPE bigint USING pg_temp.rb_login(approver_id),
    ALTER COLUMN reviewer_id TYPE bigint USING pg_temp.rb_login(reviewer_id),
    ALTER COLUMN created_by TYPE bigint USING pg_temp.rb_login(created_by),
    ALTER COLUMN updated_by TYPE bigint USING pg_temp.rb_login(updated_by);
ALTER TABLE tb_drafting_work_category_authority
    ALTER COLUMN employee_no TYPE varchar(10) USING CAST(pg_temp.rb_user(employee_no) AS varchar),
    ALTER COLUMN created_by TYPE bigint USING pg_temp.rb_login(created_by),
    ALTER COLUMN updated_by TYPE bigint USING pg_temp.rb_login(updated_by);
ALTER TABLE tb_drafting_work_category_group
    ALTER COLUMN created_by TYPE bigint USING pg_temp.rb_login(created_by),
    ALTER COLUMN updated_by TYPE bigint USING pg_temp.rb_login(updated_by);
ALTER TABLE tb_common_code_group
    ALTER COLUMN created_by TYPE bigint USING pg_temp.rb_login(created_by),
    ALTER COLUMN updated_by TYPE bigint USING pg_temp.rb_login(updated_by);
ALTER TABLE tb_common_code_item
    ALTER COLUMN created_by TYPE bigint USING pg_temp.rb_login(created_by),
    ALTER COLUMN updated_by TYPE bigint USING pg_temp.rb_login(updated_by);
ALTER TABLE tb_tenant ALTER COLUMN created_by TYPE bigint USING pg_temp.rb_login(created_by);

-- 5. 옛 FK 되살리기(이름 · 동작 그대로)
ALTER TABLE tb_user ADD CONSTRAINT tb_user_login_id_fkey
    FOREIGN KEY (login_id) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_login_account_role ADD CONSTRAINT tb_login_account_role_login_id_fkey
    FOREIGN KEY (login_id) REFERENCES tb_login_account(login_id) ON DELETE CASCADE;
ALTER TABLE tb_electronic_approval_pin ADD CONSTRAINT fk_electronic_approval_pin_user
    FOREIGN KEY (user_id) REFERENCES tb_user(user_id) ON DELETE CASCADE;
ALTER TABLE tb_electronic_approval_view_history ADD CONSTRAINT tb_electronic_approval_view_history_login_id_fkey
    FOREIGN KEY (login_id) REFERENCES tb_login_account(login_id);
ALTER TABLE tb_board_post_view_history ADD CONSTRAINT tb_board_post_view_history_login_id_fkey
    FOREIGN KEY (login_id) REFERENCES tb_login_account(login_id);
ALTER TABLE tb_notice_popup_dismissal ADD CONSTRAINT tb_notice_popup_dismissal_login_id_fkey
    FOREIGN KEY (login_id) REFERENCES tb_login_account(login_id) ON DELETE CASCADE;
ALTER TABLE tb_drafting_work_category ADD CONSTRAINT fk_drafting_work_category_approver
    FOREIGN KEY (approver_id) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category ADD CONSTRAINT fk_drafting_work_category_reviewer
    FOREIGN KEY (reviewer_id) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category ADD CONSTRAINT fk_drafting_work_category_created_by
    FOREIGN KEY (created_by) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category ADD CONSTRAINT fk_drafting_work_category_updated_by
    FOREIGN KEY (updated_by) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category_authority ADD CONSTRAINT fk_drafting_work_category_authority_created_by
    FOREIGN KEY (created_by) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category_authority ADD CONSTRAINT fk_drafting_work_category_authority_updated_by
    FOREIGN KEY (updated_by) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category_group ADD CONSTRAINT fk_drafting_work_category_group_created_by
    FOREIGN KEY (created_by) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category_group ADD CONSTRAINT fk_drafting_work_category_group_updated_by
    FOREIGN KEY (updated_by) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;

COMMIT;
