BEGIN;

ALTER TABLE tb_board_post
    RENAME COLUMN is_pinned TO is_notice;

COMMENT ON COLUMN tb_board_post.is_notice IS '중요공지 여부 (Y/N)';

COMMIT;
