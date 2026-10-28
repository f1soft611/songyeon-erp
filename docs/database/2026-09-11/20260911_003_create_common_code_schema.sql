-- 20260911_003_create_common_code_schema.sql
-- 목적: 공통코드 그룹/상세코드 테이블 생성

CREATE TABLE IF NOT EXISTS tb_common_code_group (
    common_code_group_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    group_code VARCHAR(50) NOT NULL,
    group_nm VARCHAR(200) NOT NULL,
    group_dc VARCHAR(500),
    parent_group_id BIGINT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    CONSTRAINT fk_common_code_group_tenant
        FOREIGN KEY (tenant_id) REFERENCES tb_tenant(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_common_code_group_parent
        FOREIGN KEY (parent_group_id) REFERENCES tb_common_code_group(common_code_group_id) ON DELETE RESTRICT,
    CONSTRAINT uk_common_code_group_tenant_code UNIQUE (tenant_id, group_code),
    CONSTRAINT chk_common_code_group_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE IF NOT EXISTS tb_common_code_item (
    common_code_item_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_nm VARCHAR(200) NOT NULL,
    item_dc VARCHAR(500),
    parent_item_id BIGINT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    CONSTRAINT fk_common_code_item_tenant
        FOREIGN KEY (tenant_id) REFERENCES tb_tenant(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_common_code_item_group
        FOREIGN KEY (group_id) REFERENCES tb_common_code_group(common_code_group_id) ON DELETE RESTRICT,
    CONSTRAINT fk_common_code_item_parent
        FOREIGN KEY (parent_item_id) REFERENCES tb_common_code_item(common_code_item_id) ON DELETE RESTRICT,
    CONSTRAINT uk_common_code_item_group_code UNIQUE (group_id, item_code),
    CONSTRAINT chk_common_code_item_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE INDEX IF NOT EXISTS ix_common_code_group_tenant_parent
    ON tb_common_code_group (tenant_id, parent_group_id, sort_order);

CREATE INDEX IF NOT EXISTS ix_common_code_item_group_parent
    ON tb_common_code_item (group_id, parent_item_id, sort_order);
