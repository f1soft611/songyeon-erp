-- 20261019_004_add_co_warehouse_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리 > 기초정보(분류 master) 아래에 '창고등록' 화면(화면ID BSWarehouseView)을 만든다.
--       기초정보 화면의 창고등록 탭을 화면으로 뺀 것이다. 화면ID 는 menu_code 이자 주소의 마지막 칸(화면 키)이다.
-- 권한 행(tb_menu_permission · tb_role_menu_permission)은 같은 분류의 기초정보(settings)와 똑같이 복사한다.
-- 앞선 작업: 20261016_003 (분류 코드 master) · 20261016_006 (모듈 /co)

BEGIN;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, p.module_id, p.menu_id, 'BSWarehouseView', '창고등록', '/co/master/BSWarehouseView', NULL, 40, 'Y', NULL
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'master'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT n.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'settings'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.menu_code = 'BSWarehouseView'
JOIN tb_menu_permission mp ON mp.menu_id = s.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (menu_id, permission_id) DO NOTHING;

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, n.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'settings'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.menu_code = 'BSWarehouseView'
JOIN tb_role_menu_permission rp ON rp.menu_id = s.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

COMMIT;
