-- 20261103_003_employee_id_unify.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 사람을 가리키는 값을 모두 사번(employees.id, varchar(20))으로 바꾼다
--   - 로그인 테이블 기본키: tb_login_account.login_id · tb_user.user_id 자동 번호 → 사번(자동 번호 없앰)
--   - tb_user.login_id · tb_login_account_role.login_id → 사번
--   - 업무 사람 칸(전자결재 결재선 · 고정 · 열람, 게시판 열람, 공지 팝업 닫기, 기안 업무) → 사번
--   - 사람 칸 FK 는 employees(id). 등록자 · 수정자(created_by · updated_by) 칸은 FK 없음
--   - 옛 번호 → 사번: 옛 tb_user.user_id → tb_user.login_id → tb_login_account.login_code, 옛 login_id → login_code
--   - 바꿀 수 없는 값이 하나라도 있으면 멈춘다. 다시 적용해도 같다(이미 사번인 값은 그대로)
-- 설계: docs/spec/20261103/20261103_003_사원식별자_사번통일_설계서.md
-- 롤백: 20261103_003_rollback.sql

BEGIN;

-- 1. 옛 번호 → 사번 표(테이블을 바꾸기 전에 만든다). 이미 사번이면 같은 값으로 이어진다
DROP TABLE IF EXISTS pg_temp.emp_map_login;
CREATE TEMP TABLE emp_map_login AS
SELECT CAST(la.login_id AS text) AS old_id, CAST(la.login_code AS varchar(20)) AS emp_id
FROM tb_login_account la;

DROP TABLE IF EXISTS pg_temp.emp_map_user;
CREATE TEMP TABLE emp_map_user AS
SELECT CAST(u.user_id AS text) AS old_id, CAST(la.login_code AS varchar(20)) AS emp_id
FROM tb_user u
JOIN tb_login_account la
  ON la.login_id = u.login_id
 AND la.tenant_id = u.tenant_id;

-- 옛 계정 번호 → 사번. 이미 사번이면 그대로. 못 찾으면 NULL
CREATE OR REPLACE FUNCTION pg_temp.emp_of_login(v text)
RETURNS varchar AS $$
    SELECT COALESCE((SELECT m.emp_id FROM pg_temp.emp_map_login m WHERE m.old_id = v LIMIT 1),
                    (SELECT e.id FROM employees e WHERE e.id = v))
$$ LANGUAGE sql STABLE;

-- 옛 사용자 번호 → 사번. 이미 사번이면 그대로. 못 찾으면 NULL
CREATE OR REPLACE FUNCTION pg_temp.emp_of_user(v text)
RETURNS varchar AS $$
    SELECT COALESCE((SELECT e.id FROM employees e WHERE e.id = v),
                    (SELECT m.emp_id FROM pg_temp.emp_map_user m WHERE m.old_id = v LIMIT 1))
$$ LANGUAGE sql STABLE;

-- 2. 바꿀 수 없는 값 검사
DO $$
DECLARE
    n bigint;
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('tb_login_account', 'login_id', 'login'),
            ('tb_user', 'user_id', 'user'),
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
        EXECUTE format('SELECT count(*) FROM %I WHERE %I IS NOT NULL AND pg_temp.emp_of_%s(CAST(%I AS text)) IS NULL',
                       r.tbl, r.col, r.kind, r.col) INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION '%.% 에 사번으로 바꿀 수 없는 값이 % 줄 있다', r.tbl, r.col, n;
        END IF;
    END LOOP;
END $$;

-- 3. 옛 FK 삭제(옛 번호를 가리킨다) · 이 스크립트가 거는 FK 도 지웠다가 다시 건다
ALTER TABLE tb_user DROP CONSTRAINT IF EXISTS tb_user_login_id_fkey;
ALTER TABLE tb_login_account_role DROP CONSTRAINT IF EXISTS tb_login_account_role_login_id_fkey;
ALTER TABLE tb_electronic_approval_pin DROP CONSTRAINT IF EXISTS fk_electronic_approval_pin_user;
ALTER TABLE tb_electronic_approval_view_history DROP CONSTRAINT IF EXISTS tb_electronic_approval_view_history_login_id_fkey;
ALTER TABLE tb_board_post_view_history DROP CONSTRAINT IF EXISTS tb_board_post_view_history_login_id_fkey;
ALTER TABLE tb_notice_popup_dismissal DROP CONSTRAINT IF EXISTS tb_notice_popup_dismissal_login_id_fkey;
ALTER TABLE tb_drafting_work_category DROP CONSTRAINT IF EXISTS fk_drafting_work_category_approver;
ALTER TABLE tb_drafting_work_category DROP CONSTRAINT IF EXISTS fk_drafting_work_category_reviewer;
ALTER TABLE tb_drafting_work_category DROP CONSTRAINT IF EXISTS fk_drafting_work_category_created_by;
ALTER TABLE tb_drafting_work_category DROP CONSTRAINT IF EXISTS fk_drafting_work_category_updated_by;
ALTER TABLE tb_drafting_work_category_authority DROP CONSTRAINT IF EXISTS fk_drafting_work_category_authority_created_by;
ALTER TABLE tb_drafting_work_category_authority DROP CONSTRAINT IF EXISTS fk_drafting_work_category_authority_updated_by;
ALTER TABLE tb_drafting_work_category_group DROP CONSTRAINT IF EXISTS fk_drafting_work_category_group_created_by;
ALTER TABLE tb_drafting_work_category_group DROP CONSTRAINT IF EXISTS fk_drafting_work_category_group_updated_by;

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

-- 4. 형식 · 값 바꾸기
ALTER TABLE tb_login_account ALTER COLUMN login_id DROP IDENTITY IF EXISTS;
ALTER TABLE tb_login_account ALTER COLUMN login_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(login_id AS text));
ALTER TABLE tb_user ALTER COLUMN user_id DROP IDENTITY IF EXISTS;
ALTER TABLE tb_user ALTER COLUMN user_id TYPE varchar(20) USING pg_temp.emp_of_user(CAST(user_id AS text));
ALTER TABLE tb_user ALTER COLUMN login_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(login_id AS text));
ALTER TABLE tb_login_account_role ALTER COLUMN login_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(login_id AS text));

ALTER TABLE tb_electronic_approval_line_info ALTER COLUMN participant_user_id TYPE varchar(20) USING pg_temp.emp_of_user(participant_user_id);
ALTER TABLE tb_electronic_approval_line_template_info ALTER COLUMN participant_user_id TYPE varchar(20) USING pg_temp.emp_of_user(participant_user_id);
ALTER TABLE tb_electronic_approval_pin ALTER COLUMN user_id TYPE varchar(20) USING pg_temp.emp_of_user(CAST(user_id AS text));
ALTER TABLE tb_electronic_approval_view_history ALTER COLUMN login_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(login_id AS text));
ALTER TABLE tb_board_post_view_history ALTER COLUMN login_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(login_id AS text));
ALTER TABLE tb_notice_popup_dismissal ALTER COLUMN login_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(login_id AS text));

ALTER TABLE tb_drafting_work_category
    ALTER COLUMN approver_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(approver_id AS text)),
    ALTER COLUMN reviewer_id TYPE varchar(20) USING pg_temp.emp_of_login(CAST(reviewer_id AS text)),
    ALTER COLUMN created_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(created_by AS text)),
    ALTER COLUMN updated_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(updated_by AS text));
ALTER TABLE tb_drafting_work_category_authority
    ALTER COLUMN employee_no TYPE varchar(20) USING pg_temp.emp_of_user(employee_no),
    ALTER COLUMN created_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(created_by AS text)),
    ALTER COLUMN updated_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(updated_by AS text));
ALTER TABLE tb_drafting_work_category_group
    ALTER COLUMN created_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(created_by AS text)),
    ALTER COLUMN updated_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(updated_by AS text));
ALTER TABLE tb_common_code_group
    ALTER COLUMN created_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(created_by AS text)),
    ALTER COLUMN updated_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(updated_by AS text));
ALTER TABLE tb_common_code_item
    ALTER COLUMN created_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(created_by AS text)),
    ALTER COLUMN updated_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(updated_by AS text));
ALTER TABLE tb_tenant ALTER COLUMN created_by TYPE varchar(20) USING pg_temp.emp_of_login(CAST(created_by AS text));

-- 5. FK: 로그인 테이블끼리는 지금과 같은 동작, 사람 칸은 employees(id)
ALTER TABLE tb_user ADD CONSTRAINT tb_user_login_id_fkey
    FOREIGN KEY (login_id) REFERENCES tb_login_account(login_id) ON DELETE SET NULL;
ALTER TABLE tb_login_account_role ADD CONSTRAINT tb_login_account_role_login_id_fkey
    FOREIGN KEY (login_id) REFERENCES tb_login_account(login_id) ON DELETE CASCADE;

ALTER TABLE tb_login_account ADD CONSTRAINT fk_tb_login_account_login_id_emp
    FOREIGN KEY (login_id) REFERENCES employees(id);
ALTER TABLE tb_user ADD CONSTRAINT fk_tb_user_user_id_emp
    FOREIGN KEY (user_id) REFERENCES employees(id);
ALTER TABLE tb_electronic_approval_line_info ADD CONSTRAINT fk_electronic_approval_line_info_participant_emp
    FOREIGN KEY (participant_user_id) REFERENCES employees(id);
ALTER TABLE tb_electronic_approval_line_template_info ADD CONSTRAINT fk_electronic_approval_line_template_info_participant_emp
    FOREIGN KEY (participant_user_id) REFERENCES employees(id);
ALTER TABLE tb_electronic_approval_pin ADD CONSTRAINT fk_electronic_approval_pin_emp
    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE;
ALTER TABLE tb_electronic_approval_view_history ADD CONSTRAINT fk_electronic_approval_view_history_emp
    FOREIGN KEY (login_id) REFERENCES employees(id);
ALTER TABLE tb_board_post_view_history ADD CONSTRAINT fk_board_post_view_history_emp
    FOREIGN KEY (login_id) REFERENCES employees(id);
ALTER TABLE tb_notice_popup_dismissal ADD CONSTRAINT fk_notice_popup_dismissal_emp
    FOREIGN KEY (login_id) REFERENCES employees(id) ON DELETE CASCADE;
ALTER TABLE tb_drafting_work_category ADD CONSTRAINT fk_drafting_work_category_approver_emp
    FOREIGN KEY (approver_id) REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category ADD CONSTRAINT fk_drafting_work_category_reviewer_emp
    FOREIGN KEY (reviewer_id) REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE tb_drafting_work_category_authority ADD CONSTRAINT fk_drafting_work_category_authority_employee_emp
    FOREIGN KEY (employee_no) REFERENCES employees(id);
ALTER TABLE tb_screen_review ADD CONSTRAINT fk_screen_review_reviewer_emp
    FOREIGN KEY (reviewer_emp_id) REFERENCES employees(id);
ALTER TABLE tb_screen_review_history ADD CONSTRAINT fk_screen_review_history_reviewer_emp
    FOREIGN KEY (reviewer_emp_id) REFERENCES employees(id);
ALTER TABLE tb_screen_review_draft ADD CONSTRAINT fk_screen_review_draft_writer_emp
    FOREIGN KEY (writer_emp_id) REFERENCES employees(id);

COMMIT;
