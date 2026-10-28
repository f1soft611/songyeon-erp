-- 20261022_003_groupware_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: S_ERP 그룹웨어 이관 0단계 — 사용자가 모듈관리에서 등록한 GROUPWARE 모듈 아래에 S_ERP 와 같은 메뉴를 넣는다(2026-10-22).
--   종합현황 / 문서관리 > 문서작성 · 문서현황 / 커뮤니티 > 공지사항 · 자료실 (S_ERP DB 의 menu_code · 이름 · 주소 · 순서 · 아이콘 · 설명 그대로. 사용안함인 GW_BOARD 는 뺀다)
--   - 화면 키는 주소 끝(overview · write · read · notice · archive)이다.
--   - 맨 아래 메뉴마다 기능 권한: 송연 규칙(READ · CREATE · UPDATE · DELETE · EXCEL) + S_ERP 게시판 권한(공지 BOARD_VIEW · BOARD_WRITE · BOARD_DELETE, 자료실 BOARD_VIEW · BOARD_UPLOAD)
--   - 시스템 관리자(ADMIN) 역할에 그 권한을 모두 준다(20261021_001 과 같은 규칙).
--   - 공지 · 자료실 게시판 종류(tb_board_type NOTICE · ARCHIVE)를 S_ERP 값 그대로 넣고 새 메뉴에 잇는다.
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tb_module mo JOIN tb_tenant t ON t.tenant_id = mo.tenant_id
        WHERE t.tenant_code = 'SONGYEON' AND mo.module_code = 'GROUPWARE'
    ) THEN
        RAISE EXCEPTION 'SONGYEON 테넌트에 GROUPWARE 모듈이 없습니다(모듈관리에서 먼저 등록)';
    END IF;
END $$;

-- 1) 맨 위 메뉴 3개
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT mo.tenant_id, mo.module_id, NULL, x.menu_code, x.menu_nm, x.menu_url, x.icon_nm, x.sort_order, 'Y', x.menu_dc
FROM tb_module mo
JOIN tb_tenant t ON t.tenant_id = mo.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN (VALUES
  ('GW_OVERVIEW',    '종합현황', '/groupware/overview',  NULL,     1, '결재, 공지, 일정 등 그룹웨어 업무 지표를 한 화면에서 확인합니다.'),
  ('GW_DOCUMENTS',   '문서관리', '/groupware/doc',       NULL,     2, '기안 문서와 사내 자료를 등록하고 이력을 관리합니다.'),
  ('GW_INFO_CENTER', '커뮤니티', '/groupware/community', 'folder', 3, '그룹웨어 하위 커뮤니티')
) AS x(menu_code, menu_nm, menu_url, icon_nm, sort_order, menu_dc) ON TRUE
WHERE mo.module_code = 'GROUPWARE'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 아래 메뉴 4개
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT p.tenant_id, p.module_id, p.menu_id, x.menu_code, x.menu_nm, x.menu_url, x.icon_nm, x.sort_order, 'Y', x.menu_dc
FROM tb_menu p
JOIN tb_tenant t ON t.tenant_id = p.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN (VALUES
  ('GW_DOCUMENTS',   'DOC_WRITE',  '문서작성', '/groupware/doc/write',         NULL,           11, NULL),
  ('GW_DOCUMENTS',   'DOC_READ',   '문서현황', '/groupware/doc/read',          NULL,           22, NULL),
  ('GW_INFO_CENTER', 'GW_NOTICE',  '공지사항', '/groupware/community/notice',  'announcement', 11, '비즈니스 중요 공지와 최신 소식을 한 번에 확인하세요.'),
  ('GW_INFO_CENTER', 'GW_ARCHIVE', '자료실',   '/groupware/community/archive', 'folder_open',  33, '자료실')
) AS x(parent_code, menu_code, menu_nm, menu_url, icon_nm, sort_order, menu_dc) ON x.parent_code = p.menu_code
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 3) 기능 권한(맨 아래 메뉴 5개: 종합현황 · 문서작성 · 문서현황 · 공지사항 · 자료실)
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

-- 4) 시스템 관리자(ADMIN) 역할 권한
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mp.menu_id, mp.permission_id
FROM tb_menu_permission mp
JOIN tb_menu m ON m.menu_id = mp.menu_id
JOIN tb_module mo ON mo.module_id = m.module_id AND mo.module_code = 'GROUPWARE'
JOIN tb_tenant t ON t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN tb_role r ON r.tenant_id = m.tenant_id AND r.role_code = 'ADMIN'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

-- 5) 게시판 종류(S_ERP 값 그대로, 사용안함인 BOARD 는 뺀다)
INSERT INTO tb_board_type (board_type_code, board_name, menu_id, board_kind, read_auth_level, write_auth_level, file_upload_yn, use_yn, sort_order)
SELECT x.board_type_code, x.board_name, m.menu_id, x.board_kind, x.read_auth_level, x.write_auth_level, x.file_upload_yn, 'Y', x.sort_order
FROM tb_menu m
JOIN tb_tenant t ON t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN (VALUES
  ('NOTICE',  '공지사항', 'GW_NOTICE',  'notice',  'ALL', 'MEMBER', 'Y', 1),
  ('ARCHIVE', '자료실',   'GW_ARCHIVE', 'archive', 'ALL', 'ADMIN',  'Y', 3)
) AS x(board_type_code, board_name, menu_code, board_kind, read_auth_level, write_auth_level, file_upload_yn, sort_order) ON x.menu_code = m.menu_code
ON CONFLICT (board_type_code) DO NOTHING;

COMMIT;
