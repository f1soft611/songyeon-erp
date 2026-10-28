BEGIN;

ALTER TABLE tb_board_post
    RENAME COLUMN is_notice TO is_pinned;

COMMENT ON COLUMN tb_board_post.is_pinned IS '상단 고정 여부 (Y/N)';

COMMIT;
