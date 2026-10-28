BEGIN;

CREATE TABLE IF NOT EXISTS tb_common_file (
    file_id            BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT NOT NULL,
    owner_type         VARCHAR(30) NOT NULL,
    owner_id           BIGINT NOT NULL,
    file_name          VARCHAR(255) NOT NULL,
    file_path          VARCHAR(500),
    object_key         VARCHAR(500),
    bucket_name        VARCHAR(100),
    storage_provider   VARCHAR(50) DEFAULT 'minio',
    file_size          BIGINT NOT NULL DEFAULT 0,
    mime_type          VARCHAR(150),
    checksum_sha256    VARCHAR(128),
    content_type       VARCHAR(150),
    uploaded_by        VARCHAR(100),
    deleted_yn         CHAR(1) NOT NULL DEFAULT 'N',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_common_comment (
    comment_id         BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT NOT NULL,
    owner_type         VARCHAR(30) NOT NULL,
    owner_id           BIGINT NOT NULL,
    parent_comment_id  BIGINT NULL,
    content            TEXT NOT NULL,
    writer_id          VARCHAR(100),
    writer_name        VARCHAR(150),
    deleted_yn         CHAR(1) NOT NULL DEFAULT 'N',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_common_comment_parent
        FOREIGN KEY (parent_comment_id) REFERENCES tb_common_comment(comment_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tb_common_file_owner
    ON tb_common_file (tenant_id, owner_type, owner_id, deleted_yn);

CREATE INDEX IF NOT EXISTS idx_tb_common_comment_owner
    ON tb_common_comment (tenant_id, owner_type, owner_id, deleted_yn);

COMMIT;
