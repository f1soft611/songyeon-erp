-- 20260921_003 공지사항 사용자별 조회 이력 테이블 생성
BEGIN;

CREATE TABLE IF NOT EXISTS tb_board_post_view_history (
    view_history_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tb_tenant (tenant_id),
    post_id BIGINT NOT NULL REFERENCES tb_board_post (post_id),
    login_id BIGINT NOT NULL REFERENCES tb_login_account (login_id),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_board_post_view_history_tenant_post_login
        UNIQUE (tenant_id, post_id, login_id)
);

CREATE INDEX IF NOT EXISTS ix_board_post_view_history_post
    ON tb_board_post_view_history (tenant_id, post_id);

COMMIT;
