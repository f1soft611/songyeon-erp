-- 20261103_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261103_002_screen_review_emp_id.sql 되돌리기
--   - 사번 칸을 다시 tb_user.user_id(bigint, tb_user FK)로 바꾼다. 사번 → tb_login_account.login_code → tb_user.user_id
--   - 사용자 번호로 바꿀 수 없는 사번이 하나라도 있으면 멈춘다
--   - 화면 · 서버 코드도 함께 돌려야 한다

BEGIN;

-- 사번 → tb_user.user_id. 못 찾으면 NULL
CREATE OR REPLACE FUNCTION pg_temp.sr_user_id(p_tenant_id bigint, p_emp_id varchar)
RETURNS bigint AS $$
    SELECT u.user_id
    FROM tb_login_account la
    JOIN tb_user u
      ON u.login_id = la.login_id
     AND u.tenant_id = la.tenant_id
    WHERE la.tenant_id = p_tenant_id
      AND la.login_code = p_emp_id
    ORDER BY u.user_id
    LIMIT 1
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
    n bigint;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_screen_review' AND column_name = 'reviewer_emp_id') THEN
        SELECT count(*) INTO n FROM tb_screen_review
         WHERE (reviewer_emp_id IS NOT NULL AND pg_temp.sr_user_id(tenant_id, reviewer_emp_id) IS NULL)
            OR pg_temp.sr_user_id(tenant_id, created_by) IS NULL OR pg_temp.sr_user_id(tenant_id, updated_by) IS NULL;
        IF n > 0 THEN RAISE EXCEPTION 'tb_screen_review 에 사용자 번호로 바꿀 수 없는 사번이 % 줄 있다', n; END IF;

        ALTER TABLE tb_screen_review ADD COLUMN reviewer_user_id bigint NULL;
        ALTER TABLE tb_screen_review ADD COLUMN created_by_user bigint NULL;
        ALTER TABLE tb_screen_review ADD COLUMN updated_by_user bigint NULL;
        UPDATE tb_screen_review
           SET reviewer_user_id = pg_temp.sr_user_id(tenant_id, reviewer_emp_id)
             , created_by_user  = pg_temp.sr_user_id(tenant_id, created_by)
             , updated_by_user  = pg_temp.sr_user_id(tenant_id, updated_by);
        ALTER TABLE tb_screen_review DROP COLUMN reviewer_emp_id;
        ALTER TABLE tb_screen_review DROP COLUMN created_by;
        ALTER TABLE tb_screen_review DROP COLUMN updated_by;
        ALTER TABLE tb_screen_review RENAME COLUMN created_by_user TO created_by;
        ALTER TABLE tb_screen_review RENAME COLUMN updated_by_user TO updated_by;
        ALTER TABLE tb_screen_review ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE tb_screen_review ALTER COLUMN updated_by SET NOT NULL;
        ALTER TABLE tb_screen_review ADD CONSTRAINT tb_screen_review_reviewer_user_id_fkey FOREIGN KEY (reviewer_user_id) REFERENCES tb_user(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_screen_review_history' AND column_name = 'reviewer_emp_id') THEN
        SELECT count(*) INTO n FROM tb_screen_review_history WHERE pg_temp.sr_user_id(tenant_id, reviewer_emp_id) IS NULL;
        IF n > 0 THEN RAISE EXCEPTION 'tb_screen_review_history 에 사용자 번호로 바꿀 수 없는 사번이 % 줄 있다', n; END IF;

        ALTER TABLE tb_screen_review_history ADD COLUMN reviewer_user_id bigint NULL;
        UPDATE tb_screen_review_history SET reviewer_user_id = pg_temp.sr_user_id(tenant_id, reviewer_emp_id);
        ALTER TABLE tb_screen_review_history DROP COLUMN reviewer_emp_id;
        ALTER TABLE tb_screen_review_history ALTER COLUMN reviewer_user_id SET NOT NULL;
        ALTER TABLE tb_screen_review_history ADD CONSTRAINT tb_screen_review_history_reviewer_user_id_fkey FOREIGN KEY (reviewer_user_id) REFERENCES tb_user(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tb_screen_review_draft' AND column_name = 'writer_emp_id') THEN
        SELECT count(*) INTO n FROM tb_screen_review_draft WHERE pg_temp.sr_user_id(tenant_id, writer_emp_id) IS NULL;
        IF n > 0 THEN RAISE EXCEPTION 'tb_screen_review_draft 에 사용자 번호로 바꿀 수 없는 사번이 % 줄 있다', n; END IF;

        ALTER TABLE tb_screen_review_draft DROP CONSTRAINT IF EXISTS uq_tb_screen_review_draft;
        ALTER TABLE tb_screen_review_draft ADD COLUMN writer_user_id bigint NULL;
        UPDATE tb_screen_review_draft SET writer_user_id = pg_temp.sr_user_id(tenant_id, writer_emp_id);
        ALTER TABLE tb_screen_review_draft DROP COLUMN writer_emp_id;
        ALTER TABLE tb_screen_review_draft ALTER COLUMN writer_user_id SET NOT NULL;
        ALTER TABLE tb_screen_review_draft ADD CONSTRAINT tb_screen_review_draft_writer_user_id_fkey FOREIGN KEY (writer_user_id) REFERENCES tb_user(user_id);
        ALTER TABLE tb_screen_review_draft ADD CONSTRAINT uq_tb_screen_review_draft UNIQUE (tenant_id, menu_id, writer_user_id);
    END IF;
END $$;

COMMIT;
