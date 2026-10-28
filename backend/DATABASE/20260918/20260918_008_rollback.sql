-- 20260918_008_rollback.sql
BEGIN;

ALTER TABLE tb_board_post
    DROP COLUMN IF EXISTS notice_gubun_code,
    DROP COLUMN IF EXISTS last_modified_by_name;

ALTER TABLE tb_common_comment
    DROP COLUMN IF EXISTS last_modified_by,
    DROP COLUMN IF EXISTS last_modified_by_name;

COMMIT;
