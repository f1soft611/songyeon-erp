-- 20260918_008_notice_gubun_actor_audit.sql
-- 공지사항 구분코드 및 최신 행위자 감사정보 확장
BEGIN;

ALTER TABLE tb_board_post
    ADD COLUMN IF NOT EXISTS notice_gubun_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS last_modified_by_name VARCHAR(150);

ALTER TABLE tb_common_comment
    ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_modified_by_name VARCHAR(150);

COMMIT;
