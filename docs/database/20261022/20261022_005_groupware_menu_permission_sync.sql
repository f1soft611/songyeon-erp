-- 20261022_005_groupware_menu_permission_sync.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 그룹웨어 메뉴관리 화면을 S_ERP 와 똑같이 맞춘다(2026-10-22 사용자 요청 "메뉴관리에 이것도 똑같이 적용해줘").
--   S_ERP DB 의 GROUPWARE 메뉴 · 기능 권한 · 역할 권한 · 게시판 종류를 읽어 같은 값으로 넣었다.
--   1) 게시판(GW_BOARD) 메뉴: 커뮤니티 아래, 정렬 22, 아이콘 article, 사용안함(N), 설명 '일반 게시판'
--   2) 게시판 종류 BOARD(게시판, board, 읽기 ALL · 쓰기 MEMBER, 파일 N) → GW_BOARD
--   3) 그룹웨어 메뉴의 기능 권한(tb_menu_permission)을 S_ERP 와 같게 다시 넣는다
--        커뮤니티 BOARD_VIEW / 공지사항 BOARD_VIEW · BOARD_WRITE · BOARD_DELETE / 게시판 BOARD_VIEW · BOARD_WRITE / 자료실 BOARD_VIEW · BOARD_UPLOAD
--   4) 역할 권한: 일반 사용자(DEFAULT_USER) · 플랫폼 관리자(PLATFORM_ADMIN) · 커뮤니티 관리자(ROLE_INFO_MANAGER)를 S_ERP 와 같게 다시 넣는다
--   - 시스템 관리자(ADMIN)는 S_ERP 에 그룹웨어 권한이 없지만, 송연 관리자 계정이 이 역할이라 20261022_003 값을 그대로 둔다.
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 1) 게시판 메뉴
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT p.tenant_id, p.module_id, p.menu_id, 'GW_BOARD', '게시판', '/groupware/community/board', 'article', 22, 'N', '일반 게시판'
FROM tb_menu p
JOIN tb_tenant t ON t.tenant_id = p.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE p.menu_code = 'GW_INFO_CENTER'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 게시판 종류 BOARD
INSERT INTO tb_board_type (board_type_code, board_name, menu_id, board_kind, read_auth_level, write_auth_level, file_upload_yn, use_yn, sort_order)
SELECT 'BOARD', '게시판', m.menu_id, 'board', 'ALL', 'MEMBER', 'N', 'Y', 2
FROM tb_menu m
JOIN tb_tenant t ON t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE m.menu_code = 'GW_BOARD'
ON CONFLICT (board_type_code) DO NOTHING;

-- 3) 기능 권한: 그룹웨어 메뉴 것을 지우고 S_ERP 값으로
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
  ('GW_INFO_CENTER', 'BOARD_VIEW'),
  ('GW_NOTICE',  'BOARD_VIEW'), ('GW_NOTICE', 'BOARD_WRITE'), ('GW_NOTICE', 'BOARD_DELETE'),
  ('GW_BOARD',   'BOARD_VIEW'), ('GW_BOARD',  'BOARD_WRITE'),
  ('GW_ARCHIVE', 'BOARD_VIEW'), ('GW_ARCHIVE', 'BOARD_UPLOAD')
) AS x(menu_code, permission_code) ON x.menu_code = m.menu_code
JOIN tb_permission pm ON pm.permission_code = x.permission_code
ON CONFLICT (menu_id, permission_id) DO NOTHING;

-- 4) 역할 권한(ADMIN 제외 3개 역할): 그룹웨어 메뉴 것을 지우고 S_ERP 값으로
DELETE FROM tb_role_menu_permission x
USING tb_menu m, tb_module mo, tb_tenant t, tb_role r
WHERE m.menu_id = x.menu_id
  AND mo.module_id = m.module_id AND mo.module_code = 'GROUPWARE'
  AND t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
  AND r.role_id = x.role_id
  AND r.role_code IN ('DEFAULT_USER', 'PLATFORM_ADMIN', 'ROLE_INFO_MANAGER');

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, m.menu_id, pm.permission_id
FROM tb_menu m
JOIN tb_tenant t ON t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN (VALUES
  ('DEFAULT_USER', 'GW_OVERVIEW', 'READ'),
  ('DEFAULT_USER', 'DOC_WRITE', 'CREATE'), ('DEFAULT_USER', 'DOC_WRITE', 'READ'), ('DEFAULT_USER', 'DOC_WRITE', 'UPDATE'),
  ('DEFAULT_USER', 'DOC_READ',  'CREATE'), ('DEFAULT_USER', 'DOC_READ',  'READ'), ('DEFAULT_USER', 'DOC_READ',  'UPDATE'),
  ('DEFAULT_USER', 'GW_NOTICE', 'READ'),
  ('DEFAULT_USER', 'GW_ARCHIVE', 'READ'),
  ('PLATFORM_ADMIN', 'GW_OVERVIEW',  'CREATE'), ('PLATFORM_ADMIN', 'GW_OVERVIEW',  'DELETE'), ('PLATFORM_ADMIN', 'GW_OVERVIEW',  'EXCEL'), ('PLATFORM_ADMIN', 'GW_OVERVIEW',  'READ'), ('PLATFORM_ADMIN', 'GW_OVERVIEW',  'UPDATE'),
  ('PLATFORM_ADMIN', 'GW_DOCUMENTS', 'CREATE'), ('PLATFORM_ADMIN', 'GW_DOCUMENTS', 'DELETE'), ('PLATFORM_ADMIN', 'GW_DOCUMENTS', 'EXCEL'), ('PLATFORM_ADMIN', 'GW_DOCUMENTS', 'READ'), ('PLATFORM_ADMIN', 'GW_DOCUMENTS', 'UPDATE'),
  ('PLATFORM_ADMIN', 'DOC_WRITE',    'CREATE'), ('PLATFORM_ADMIN', 'DOC_WRITE',    'DELETE'), ('PLATFORM_ADMIN', 'DOC_WRITE',    'EXCEL'), ('PLATFORM_ADMIN', 'DOC_WRITE',    'READ'), ('PLATFORM_ADMIN', 'DOC_WRITE',    'UPDATE'),
  ('PLATFORM_ADMIN', 'DOC_READ',     'CREATE'), ('PLATFORM_ADMIN', 'DOC_READ',     'DELETE'), ('PLATFORM_ADMIN', 'DOC_READ',     'READ'), ('PLATFORM_ADMIN', 'DOC_READ',     'UPDATE'),
  ('PLATFORM_ADMIN', 'GW_NOTICE',    'CREATE'), ('PLATFORM_ADMIN', 'GW_NOTICE',    'DELETE'), ('PLATFORM_ADMIN', 'GW_NOTICE',    'EXCEL'), ('PLATFORM_ADMIN', 'GW_NOTICE',    'READ'), ('PLATFORM_ADMIN', 'GW_NOTICE',    'UPDATE'),
  ('PLATFORM_ADMIN', 'GW_BOARD',     'CREATE'), ('PLATFORM_ADMIN', 'GW_BOARD',     'DELETE'), ('PLATFORM_ADMIN', 'GW_BOARD',     'EXCEL'), ('PLATFORM_ADMIN', 'GW_BOARD',     'UPDATE'),
  ('PLATFORM_ADMIN', 'GW_ARCHIVE',   'CREATE'), ('PLATFORM_ADMIN', 'GW_ARCHIVE',   'DELETE'), ('PLATFORM_ADMIN', 'GW_ARCHIVE',   'EXCEL'), ('PLATFORM_ADMIN', 'GW_ARCHIVE',   'READ'), ('PLATFORM_ADMIN', 'GW_ARCHIVE',   'UPDATE'),
  ('ROLE_INFO_MANAGER', 'GW_INFO_CENTER', 'BOARD_DELETE'), ('ROLE_INFO_MANAGER', 'GW_INFO_CENTER', 'BOARD_UPLOAD'), ('ROLE_INFO_MANAGER', 'GW_INFO_CENTER', 'BOARD_VIEW'), ('ROLE_INFO_MANAGER', 'GW_INFO_CENTER', 'BOARD_WRITE'),
  ('ROLE_INFO_MANAGER', 'GW_NOTICE',  'BOARD_DELETE'), ('ROLE_INFO_MANAGER', 'GW_NOTICE',  'BOARD_UPLOAD'), ('ROLE_INFO_MANAGER', 'GW_NOTICE',  'BOARD_VIEW'), ('ROLE_INFO_MANAGER', 'GW_NOTICE',  'BOARD_WRITE'), ('ROLE_INFO_MANAGER', 'GW_NOTICE',  'READ'),
  ('ROLE_INFO_MANAGER', 'GW_BOARD',   'BOARD_DELETE'), ('ROLE_INFO_MANAGER', 'GW_BOARD',   'BOARD_UPLOAD'), ('ROLE_INFO_MANAGER', 'GW_BOARD',   'BOARD_VIEW'), ('ROLE_INFO_MANAGER', 'GW_BOARD',   'BOARD_WRITE'),
  ('ROLE_INFO_MANAGER', 'GW_ARCHIVE', 'BOARD_DELETE'), ('ROLE_INFO_MANAGER', 'GW_ARCHIVE', 'BOARD_UPLOAD'), ('ROLE_INFO_MANAGER', 'GW_ARCHIVE', 'BOARD_VIEW'), ('ROLE_INFO_MANAGER', 'GW_ARCHIVE', 'BOARD_WRITE'), ('ROLE_INFO_MANAGER', 'GW_ARCHIVE', 'READ')
) AS x(role_code, menu_code, permission_code) ON x.menu_code = m.menu_code
JOIN tb_role r ON r.tenant_id = m.tenant_id AND r.role_code = x.role_code
JOIN tb_permission pm ON pm.permission_code = x.permission_code
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

COMMIT;
