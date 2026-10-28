-- 20260915_001_create_board_info_schema_rollback.sql
-- 목적: 그룹웨어 하위 커뮤니티 게시판/시드 데이터 롤백

BEGIN;

DELETE FROM tb_role_menu_permission
WHERE role_id IN (
    SELECT role_id
    FROM tb_role
    WHERE role_code = 'ROLE_COMMUNITY_MANAGER'
)
AND menu_id IN (
    SELECT menu_id
    FROM tb_menu
    WHERE menu_code IN ('GW_COMMUNITY', 'GW_NOTICE', 'GW_BOARD', 'GW_ARCHIVE')
);

DELETE FROM tb_menu_permission
WHERE menu_id IN (
    SELECT menu_id
    FROM tb_menu
    WHERE menu_code IN ('GW_COMMUNITY', 'GW_NOTICE', 'GW_BOARD', 'GW_ARCHIVE')
);

DELETE FROM tb_permission
WHERE permission_code IN ('BOARD_VIEW', 'BOARD_WRITE', 'BOARD_DELETE', 'BOARD_UPLOAD');

DELETE FROM tb_role
WHERE role_code = 'ROLE_COMMUNITY_MANAGER';

DELETE FROM tb_menu
WHERE menu_code IN ('GW_COMMUNITY', 'GW_NOTICE', 'GW_BOARD', 'GW_ARCHIVE');

DELETE FROM tb_board_file;
DELETE FROM tb_board_post;
DELETE FROM tb_board_type;

DROP TABLE IF EXISTS tb_board_file;
DROP TABLE IF EXISTS tb_board_post;
DROP TABLE IF EXISTS tb_board_type;

COMMIT;
