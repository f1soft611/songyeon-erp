-- 20260921_003 공지사항 사용자별 조회 이력 롤백
BEGIN;

DROP INDEX IF EXISTS ix_board_post_view_history_post;
DROP TABLE IF EXISTS tb_board_post_view_history;

COMMIT;
