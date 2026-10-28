-- 20260915_001_create_board_info_schema.sql
-- 목적: 그룹웨어 하위의 커뮤니티 중메뉴와 공지사항/게시판/자료실 통합 관리용 스키마/시드 데이터 생성
-- 핵심 구조: GROUPWARE 모듈 아래에 '커뮤니티' 중메뉴를 두고, 그 아래로 공지사항/게시판/자료실을 배치한다.

BEGIN;

CREATE TABLE IF NOT EXISTS tb_board_type (
    board_type_code    VARCHAR(30) PRIMARY KEY,
    board_name         VARCHAR(100) NOT NULL,
    menu_id            BIGINT NOT NULL,
    board_kind         VARCHAR(20) NOT NULL CHECK (board_kind IN ('notice', 'board', 'archive')),
    read_auth_level    VARCHAR(20) NOT NULL DEFAULT 'ALL',
    write_auth_level   VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    file_upload_yn     CHAR(1) NOT NULL DEFAULT 'N',
    use_yn             CHAR(1) NOT NULL DEFAULT 'Y',
    sort_order         INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_board_type_menu
        FOREIGN KEY (menu_id) REFERENCES tb_menu(menu_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS tb_board_post (
    post_id            BIGSERIAL PRIMARY KEY,
    board_type_code    VARCHAR(30) NOT NULL,
    title              VARCHAR(200) NOT NULL,
    contents           TEXT,
    writer_id          VARCHAR(50) NOT NULL,
    writer_name        VARCHAR(100),
    view_count         INT NOT NULL DEFAULT 0,
    is_notice          CHAR(1) NOT NULL DEFAULT 'N',
    is_deleted         CHAR(1) NOT NULL DEFAULT 'N',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_board_post_type
        FOREIGN KEY (board_type_code)
        REFERENCES tb_board_type(board_type_code)
);

CREATE TABLE IF NOT EXISTS tb_board_file (
    board_file_id      BIGSERIAL PRIMARY KEY,
    post_id            BIGINT NOT NULL,
    file_name          VARCHAR(255) NOT NULL,
    file_path          VARCHAR(500) NOT NULL,
    file_size          BIGINT NOT NULL DEFAULT 0,
    mime_type          VARCHAR(100),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_board_file_post
        FOREIGN KEY (post_id)
        REFERENCES tb_board_post(post_id)
        ON DELETE CASCADE
);

-- 그룹웨어 모듈 기준으로 커뮤니티 중메뉴 생성
INSERT INTO tb_menu (
    tenant_id,
    module_id,
    parent_menu_id,
    menu_code,
    menu_nm,
    menu_url,
    icon_nm,
    sort_order,
    use_at,
    created_at,
    updated_at,
    menu_dc
)
SELECT
    t.tenant_id,
    m.module_id,
    NULL,
    'GW_COMMUNITY',
    '커뮤니티',
    '/groupware/community',
    'folder',
    10,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    '그룹웨어 하위 커뮤니티'
FROM tb_tenant t
JOIN tb_module m ON m.module_code = 'GROUPWARE'
WHERE t.tenant_id = (
    SELECT MIN(tenant_id)
    FROM tb_tenant
)
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu mm
    WHERE mm.menu_code = 'GW_COMMUNITY'
);

-- 커뮤니티 중메뉴 아래: 공지사항
INSERT INTO tb_menu (
    tenant_id,
    module_id,
    parent_menu_id,
    menu_code,
    menu_nm,
    menu_url,
    icon_nm,
    sort_order,
    use_at,
    created_at,
    updated_at,
    menu_dc
)
SELECT
    t.tenant_id,
    m.module_id,
    p.menu_id,
    'GW_NOTICE',
    '공지사항',
    '/groupware/community/notice',
    'announcement',
    1,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    '공지사항'
FROM tb_tenant t
JOIN tb_module m ON m.module_code = 'GROUPWARE'
JOIN tb_menu p ON p.menu_code = 'GW_COMMUNITY'
WHERE t.tenant_id = (
    SELECT MIN(tenant_id)
    FROM tb_tenant
)
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu mm
    WHERE mm.menu_code = 'GW_NOTICE'
);

-- 커뮤니티 중메뉴 아래: 게시판
INSERT INTO tb_menu (
    tenant_id,
    module_id,
    parent_menu_id,
    menu_code,
    menu_nm,
    menu_url,
    icon_nm,
    sort_order,
    use_at,
    created_at,
    updated_at,
    menu_dc
)
SELECT
    t.tenant_id,
    m.module_id,
    p.menu_id,
    'GW_BOARD',
    '게시판',
    '/groupware/community/board',
    'article',
    2,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    '일반 게시판'
FROM tb_tenant t
JOIN tb_module m ON m.module_code = 'GROUPWARE'
JOIN tb_menu p ON p.menu_code = 'GW_COMMUNITY'
WHERE t.tenant_id = (
    SELECT MIN(tenant_id)
    FROM tb_tenant
)
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu mm
    WHERE mm.menu_code = 'GW_BOARD'
);

-- 커뮤니티 중메뉴 아래: 자료실
INSERT INTO tb_menu (
    tenant_id,
    module_id,
    parent_menu_id,
    menu_code,
    menu_nm,
    menu_url,
    icon_nm,
    sort_order,
    use_at,
    created_at,
    updated_at,
    menu_dc
)
SELECT
    t.tenant_id,
    m.module_id,
    p.menu_id,
    'GW_ARCHIVE',
    '자료실',
    '/groupware/community/archive',
    'folder_open',
    3,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    '자료실'
FROM tb_tenant t
JOIN tb_module m ON m.module_code = 'GROUPWARE'
JOIN tb_menu p ON p.menu_code = 'GW_COMMUNITY'
WHERE t.tenant_id = (
    SELECT MIN(tenant_id)
    FROM tb_tenant
)
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu mm
    WHERE mm.menu_code = 'GW_ARCHIVE'
);

-- 기본 권한 생성
INSERT INTO tb_permission (
    permission_id,
    permission_code,
    permission_nm,
    sort_order,
    use_at,
    created_at,
    updated_at
)
SELECT
    COALESCE((SELECT MAX(permission_id) + 1 FROM tb_permission), 20001),
    'BOARD_VIEW',
    '조회',
    1,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM tb_permission p
    WHERE p.permission_code = 'BOARD_VIEW'
);

INSERT INTO tb_permission (
    permission_id,
    permission_code,
    permission_nm,
    sort_order,
    use_at,
    created_at,
    updated_at
)
SELECT
    COALESCE((SELECT MAX(permission_id) + 1 FROM tb_permission), 20002),
    'BOARD_WRITE',
    '등록',
    2,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM tb_permission p
    WHERE p.permission_code = 'BOARD_WRITE'
);

INSERT INTO tb_permission (
    permission_id,
    permission_code,
    permission_nm,
    sort_order,
    use_at,
    created_at,
    updated_at
)
SELECT
    COALESCE((SELECT MAX(permission_id) + 1 FROM tb_permission), 20003),
    'BOARD_DELETE',
    '삭제',
    3,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM tb_permission p
    WHERE p.permission_code = 'BOARD_DELETE'
);

INSERT INTO tb_permission (
    permission_id,
    permission_code,
    permission_nm,
    sort_order,
    use_at,
    created_at,
    updated_at
)
SELECT
    COALESCE((SELECT MAX(permission_id) + 1 FROM tb_permission), 20004),
    'BOARD_UPLOAD',
    '파일업로드',
    4,
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM tb_permission p
    WHERE p.permission_code = 'BOARD_UPLOAD'
);

-- 커뮤니티 관리자 역할 생성
INSERT INTO tb_role (
    role_id,
    tenant_id,
    role_code,
    role_nm,
    role_dc,
    use_at,
    is_system_role,
    created_at,
    updated_at
)
SELECT
    COALESCE((SELECT MAX(role_id) + 1 FROM tb_role), 5001),
    t.tenant_id,
    'ROLE_COMMUNITY_MANAGER',
    '커뮤니티 관리자',
    '그룹웨어 하위 커뮤니티 전체 관리 권한',
    'Y',
    'N',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_id = (
    SELECT MIN(tenant_id)
    FROM tb_tenant
)
AND NOT EXISTS (
    SELECT 1
    FROM tb_role r
    WHERE r.role_code = 'ROLE_COMMUNITY_MANAGER'
);

-- 게시판 유형 정의
INSERT INTO tb_board_type (
    board_type_code,
    board_name,
    menu_id,
    board_kind,
    read_auth_level,
    write_auth_level,
    file_upload_yn,
    use_yn,
    sort_order,
    created_at,
    updated_at
)
SELECT
    'NOTICE',
    '공지사항',
    m.menu_id,
    'notice',
    'ADMIN',
    'ADMIN',
    'N',
    'Y',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_menu m
WHERE m.menu_code = 'GW_NOTICE'
AND NOT EXISTS (
    SELECT 1 FROM tb_board_type WHERE board_type_code = 'NOTICE'
);

INSERT INTO tb_board_type (
    board_type_code,
    board_name,
    menu_id,
    board_kind,
    read_auth_level,
    write_auth_level,
    file_upload_yn,
    use_yn,
    sort_order,
    created_at,
    updated_at
)
SELECT
    'BOARD',
    '게시판',
    m.menu_id,
    'board',
    'ALL',
    'MEMBER',
    'N',
    'Y',
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_menu m
WHERE m.menu_code = 'GW_BOARD'
AND NOT EXISTS (
    SELECT 1 FROM tb_board_type WHERE board_type_code = 'BOARD'
);

INSERT INTO tb_board_type (
    board_type_code,
    board_name,
    menu_id,
    board_kind,
    read_auth_level,
    write_auth_level,
    file_upload_yn,
    use_yn,
    sort_order,
    created_at,
    updated_at
)
SELECT
    'ARCHIVE',
    '자료실',
    m.menu_id,
    'archive',
    'ALL',
    'ADMIN',
    'Y',
    'Y',
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_menu m
WHERE m.menu_code = 'GW_ARCHIVE'
AND NOT EXISTS (
    SELECT 1 FROM tb_board_type WHERE board_type_code = 'ARCHIVE'
);

-- 메뉴-권한 연결
INSERT INTO tb_menu_permission (
    menu_id,
    permission_id,
    created_at,
    updated_at
)
SELECT
    m.menu_id,
    p.permission_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_menu m
JOIN tb_permission p ON p.permission_code = 'BOARD_VIEW'
WHERE m.menu_code IN ('GW_COMMUNITY', 'GW_NOTICE', 'GW_BOARD', 'GW_ARCHIVE')
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu_permission mp
    WHERE mp.menu_id = m.menu_id
      AND mp.permission_id = p.permission_id
);

INSERT INTO tb_menu_permission (
    menu_id,
    permission_id,
    created_at,
    updated_at
)
SELECT
    m.menu_id,
    p.permission_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_menu m
JOIN tb_permission p ON p.permission_code = 'BOARD_WRITE'
WHERE m.menu_code IN ('GW_NOTICE', 'GW_BOARD')
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu_permission mp
    WHERE mp.menu_id = m.menu_id
      AND mp.permission_id = p.permission_id
);

INSERT INTO tb_menu_permission (
    menu_id,
    permission_id,
    created_at,
    updated_at
)
SELECT
    m.menu_id,
    p.permission_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_menu m
JOIN tb_permission p ON p.permission_code = 'BOARD_DELETE'
WHERE m.menu_code = 'GW_NOTICE'
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu_permission mp
    WHERE mp.menu_id = m.menu_id
      AND mp.permission_id = p.permission_id
);

INSERT INTO tb_menu_permission (
    menu_id,
    permission_id,
    created_at,
    updated_at
)
SELECT
    m.menu_id,
    p.permission_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_menu m
JOIN tb_permission p ON p.permission_code = 'BOARD_UPLOAD'
WHERE m.menu_code = 'GW_ARCHIVE'
AND NOT EXISTS (
    SELECT 1
    FROM tb_menu_permission mp
    WHERE mp.menu_id = m.menu_id
      AND mp.permission_id = p.permission_id
);

-- 그룹웨어 커뮤니티 관리자 역할 매핑
INSERT INTO tb_role_menu_permission (
    role_id,
    menu_id,
    permission_id,
    created_at,
    updated_at
)
SELECT
    r.role_id,
    m.menu_id,
    p.permission_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tb_role r
JOIN tb_menu m ON m.menu_code IN ('GW_COMMUNITY', 'GW_NOTICE', 'GW_BOARD', 'GW_ARCHIVE')
JOIN tb_permission p ON p.permission_code IN ('BOARD_VIEW', 'BOARD_WRITE', 'BOARD_DELETE', 'BOARD_UPLOAD')
WHERE r.role_code = 'ROLE_COMMUNITY_MANAGER'
AND NOT EXISTS (
    SELECT 1
    FROM tb_role_menu_permission rp
    WHERE rp.role_id = r.role_id
      AND rp.menu_id = m.menu_id
      AND rp.permission_id = p.permission_id
);

COMMIT;
