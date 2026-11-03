-- 20261103_002_screen_review_emp_id.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 화면검수 검수자 · 작성자 · 등록자 · 수정자를 사번(employees.id)으로 저장한다
--       (2026-11-03 사용자 결정: "사원관련은 employees의 id를 쓰고싶은데". 송연 다른 화면의 등록자 · 수정자와 같은 방식)
--   tb_screen_review          reviewer_user_id(bigint, tb_user FK) → reviewer_emp_id varchar(20)
--                             created_by · updated_by bigint → varchar(20)
--   tb_screen_review_history  reviewer_user_id(bigint NOT NULL, tb_user FK) → reviewer_emp_id varchar(20) NOT NULL
--   tb_screen_review_draft    writer_user_id(bigint NOT NULL, tb_user FK) → writer_emp_id varchar(20) NOT NULL
--                             UNIQUE (tenant_id, menu_id, writer_user_id) → UNIQUE (tenant_id, menu_id, writer_emp_id)
--   - 이미 있는 값은 tb_user → tb_login_account.login_code(= employees.id)로 바꾼다(LoginEmployeeResolver 와 같은 찾기)
--   - 바꿀 수 없는 값이 하나라도 있으면 멈춘다
--   - 사번 칸에는 FK 를 걸지 않는다(송연 다른 테이블과 같다). 이름은 조회할 때 employees.name
-- 다시 돌려도 결과가 같다(예전 칸이 없으면 건너뛴다).

BEGIN;

-- tb_user.user_id → 사번. 못 찾으면 NULL
CREATE OR REPLACE FUNCTION pg_temp.sr_emp_id(p_user_id bigint)
RETURNS varchar AS $$
    SELECT la.login_code
    FROM tb_user u
    JOIN tb_login_account la
      ON la.login_id = u.login_id
     AND la.tenant_id = u.tenant_id
    WHERE u.user_id = p_user_id
    LIMIT 1
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
    n bigint;
BEGIN
    -- 바꿀 수 없는 값 검사
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_screen_review' AND column_name = 'reviewer_user_id') THEN
        SELECT count(*) INTO n FROM tb_screen_review
         WHERE (reviewer_user_id IS NOT NULL AND pg_temp.sr_emp_id(reviewer_user_id) IS NULL)
            OR pg_temp.sr_emp_id(created_by) IS NULL OR pg_temp.sr_emp_id(updated_by) IS NULL;
        IF n > 0 THEN RAISE EXCEPTION 'tb_screen_review 에 사번으로 바꿀 수 없는 사용자 번호가 % 줄 있다', n; END IF;

        ALTER TABLE tb_screen_review DROP CONSTRAINT IF EXISTS tb_screen_review_reviewer_user_id_fkey;
        ALTER TABLE tb_screen_review ADD COLUMN reviewer_emp_id varchar(20) NULL;
        ALTER TABLE tb_screen_review ADD COLUMN created_by_emp varchar(20) NULL;
        ALTER TABLE tb_screen_review ADD COLUMN updated_by_emp varchar(20) NULL;
        UPDATE tb_screen_review
           SET reviewer_emp_id = pg_temp.sr_emp_id(reviewer_user_id)
             , created_by_emp  = pg_temp.sr_emp_id(created_by)
             , updated_by_emp  = pg_temp.sr_emp_id(updated_by);
        ALTER TABLE tb_screen_review DROP COLUMN reviewer_user_id;
        ALTER TABLE tb_screen_review DROP COLUMN created_by;
        ALTER TABLE tb_screen_review DROP COLUMN updated_by;
        ALTER TABLE tb_screen_review RENAME COLUMN created_by_emp TO created_by;
        ALTER TABLE tb_screen_review RENAME COLUMN updated_by_emp TO updated_by;
        ALTER TABLE tb_screen_review ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE tb_screen_review ALTER COLUMN updated_by SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_screen_review_history' AND column_name = 'reviewer_user_id') THEN
        SELECT count(*) INTO n FROM tb_screen_review_history WHERE pg_temp.sr_emp_id(reviewer_user_id) IS NULL;
        IF n > 0 THEN RAISE EXCEPTION 'tb_screen_review_history 에 사번으로 바꿀 수 없는 사용자 번호가 % 줄 있다', n; END IF;

        ALTER TABLE tb_screen_review_history DROP CONSTRAINT IF EXISTS tb_screen_review_history_reviewer_user_id_fkey;
        ALTER TABLE tb_screen_review_history ADD COLUMN reviewer_emp_id varchar(20) NULL;
        UPDATE tb_screen_review_history SET reviewer_emp_id = pg_temp.sr_emp_id(reviewer_user_id);
        ALTER TABLE tb_screen_review_history DROP COLUMN reviewer_user_id;
        ALTER TABLE tb_screen_review_history ALTER COLUMN reviewer_emp_id SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_screen_review_draft' AND column_name = 'writer_user_id') THEN
        SELECT count(*) INTO n FROM tb_screen_review_draft WHERE pg_temp.sr_emp_id(writer_user_id) IS NULL;
        IF n > 0 THEN RAISE EXCEPTION 'tb_screen_review_draft 에 사번으로 바꿀 수 없는 사용자 번호가 % 줄 있다', n; END IF;

        ALTER TABLE tb_screen_review_draft DROP CONSTRAINT IF EXISTS uq_tb_screen_review_draft;
        ALTER TABLE tb_screen_review_draft DROP CONSTRAINT IF EXISTS tb_screen_review_draft_writer_user_id_fkey;
        ALTER TABLE tb_screen_review_draft ADD COLUMN writer_emp_id varchar(20) NULL;
        UPDATE tb_screen_review_draft SET writer_emp_id = pg_temp.sr_emp_id(writer_user_id);
        ALTER TABLE tb_screen_review_draft DROP COLUMN writer_user_id;
        ALTER TABLE tb_screen_review_draft ALTER COLUMN writer_emp_id SET NOT NULL;
        ALTER TABLE tb_screen_review_draft ADD CONSTRAINT uq_tb_screen_review_draft UNIQUE (tenant_id, menu_id, writer_emp_id);
    END IF;
END $$;

COMMENT ON COLUMN tb_screen_review.reviewer_emp_id IS '마지막 검수자 사번(employees.id)';
COMMENT ON COLUMN tb_screen_review.created_by IS '등록자 사번(employees.id)';
COMMENT ON COLUMN tb_screen_review.updated_by IS '수정자 사번(employees.id)';
COMMENT ON COLUMN tb_screen_review_history.reviewer_emp_id IS '검수자 사번(employees.id)';
COMMENT ON COLUMN tb_screen_review_draft.writer_emp_id IS '작성자 사번(employees.id)';

COMMIT;
