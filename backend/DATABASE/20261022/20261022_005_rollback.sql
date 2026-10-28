-- 20261022_005_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261022_005 되돌리기 — 20261022_003 적용 직후 상태로 돌린다.
--   게시판 종류 BOARD · 게시판 메뉴(GW_BOARD) 삭제, 3개 역할의 그룹웨어 권한 삭제, 기능 권한을 003 값으로 다시 넣음.
-- 주의: BOARD 게시판 종류를 가리키는 글이 생긴 뒤라면 확인하고 돌린다.

BEGIN;

DELETE FROM tb_board_type bt
USING tb_menu m, tb_tenant t
WHERE m.menu_id = bt.menu_id
  AND t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
  AND bt.board_type_code = 'BOARD' AND m.menu_code = 'GW_BOARD';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
  AND m.menu_code = 'GW_BOARD';

DELETE FROM tb_role_menu_permission x
USING tb_menu m, tb_module mo, tb_tenant t, tb_role r
WHERE m.menu_id = x.menu_id
  AND mo.module_id = m.module_id AND mo.module_code = 'GROUPWARE'
  AND t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
  AND r.role_id = x.role_id
  AND r.role_code IN ('DEFAULT_USER', 'PLATFORM_ADMIN', 'ROLE_INFO_MANAGER');

DELETE FROM tb_menu_permission mp
USING tb_menu m, tb_module mo, tb_tenant t
WHERE m.menu_id = mp.menu_id
  AND mo.module_id = m.module_id AND mo.module_code = 'GROUPWARE'
  AND t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON';

INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT m.menu_id, pm.permission_id
FROM tb_menu m
JOIN tb_tenant t ON t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN (VALUES
  ('GW_OVERVIEW', 'READ'), ('GW_OVERVIEW', 'CREATE'), ('GW_OVERVIEW', 'UPDATE'), ('GW_OVERVIEW', 'DELETE'), ('GW_OVERVIEW', 'EXCEL'),
  ('DOC_WRITE',   'READ'), ('DOC_WRITE',   'CREATE'), ('DOC_WRITE',   'UPDATE'), ('DOC_WRITE',   'DELETE'), ('DOC_WRITE',   'EXCEL'),
  ('DOC_READ',    'READ'), ('DOC_READ',    'CREATE'), ('DOC_READ',    'UPDATE'), ('DOC_READ',    'DELETE'), ('DOC_READ',    'EXCEL'),
  ('GW_NOTICE',   'READ'), ('GW_NOTICE',   'CREATE'), ('GW_NOTICE',   'UPDATE'), ('GW_NOTICE',   'DELETE'), ('GW_NOTICE',   'EXCEL'),
  ('GW_NOTICE',   'BOARD_VIEW'), ('GW_NOTICE', 'BOARD_WRITE'), ('GW_NOTICE', 'BOARD_DELETE'),
  ('GW_ARCHIVE',  'READ'), ('GW_ARCHIVE',  'CREATE'), ('GW_ARCHIVE',  'UPDATE'), ('GW_ARCHIVE',  'DELETE'), ('GW_ARCHIVE',  'EXCEL'),
  ('GW_ARCHIVE',  'BOARD_VIEW'), ('GW_ARCHIVE', 'BOARD_UPLOAD')
) AS x(menu_code, permission_code) ON x.menu_code = m.menu_code
JOIN tb_permission pm ON pm.permission_code = x.permission_code
ON CONFLICT (menu_id, permission_id) DO NOTHING;

COMMIT;
