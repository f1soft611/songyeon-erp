-- 20260831_004_seed_module_menu.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 에프원소프트(T1358606250) 테넌트에 초기 모듈/메뉴 시드 데이터 등록

INSERT INTO tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
SELECT tenant_id, 'GROUPWARE', '그룹웨어', 'Groups', '/groupware', 1, 'Y'
FROM tb_tenant WHERE tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, module_code) DO NOTHING;

INSERT INTO tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
SELECT tenant_id, 'SETTINGS', '환경설정', 'Settings', '/settings', 2, 'Y'
FROM tb_tenant WHERE tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, module_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at)
SELECT t.tenant_id, m.module_id, NULL, 'GW_OVERVIEW', '종합현황', '/groupware/overview', NULL, 1, 'Y'
FROM tb_tenant t JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'GROUPWARE'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at)
SELECT t.tenant_id, m.module_id, NULL, 'GW_DOCUMENTS', '문서관리', '/groupware/documents', NULL, 2, 'Y'
FROM tb_tenant t JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'GROUPWARE'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at)
SELECT t.tenant_id, m.module_id, NULL, 'ST_SYSTEM', '시스템 관리', '/settings/system', NULL, 1, 'Y'
FROM tb_tenant t JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at)
SELECT t.tenant_id, m.module_id, p.menu_id, 'ST_ROLES', '권한관리', '/settings/system/roles', NULL, 1, 'Y'
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'ST_SYSTEM'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at)
SELECT t.tenant_id, m.module_id, p.menu_id, 'ST_MENUS', '메뉴관리', '/settings/system/menus', NULL, 2, 'Y'
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'ST_SYSTEM'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at)
SELECT t.tenant_id, m.module_id, p.menu_id, 'ST_F1_GRID_TEST', 'F1 Grid 테스트', '/settings/system/f1-grid-test', NULL, 3, 'Y'
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'ST_SYSTEM'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;
