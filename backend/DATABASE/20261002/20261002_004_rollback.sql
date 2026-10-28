-- 20261002_004_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_004 되돌리기 — 창고관리·고객정보 메뉴와 기능·역할 권한을 20261002_001 과 같은 값으로 다시 넣는다.

BEGIN;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, m.module_id, p.menu_id, c.menu_code, c.menu_nm, c.menu_url, NULL, c.sort_order, 'Y', c.menu_dc
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'ST_SYSTEM'
CROSS JOIN (VALUES
  ('ST_WAREHOUSE', '창고관리', '/settings/system/warehouses', 50, '테넌트별 창고 마스터(창고명, 사용 여부)를 관리합니다.'),
  ('ST_CUSTOMER', '고객정보', '/settings/system/customers', 60, '고객 기본정보와 사업자정보, 연락처를 관리합니다.')
) AS c(menu_code, menu_nm, menu_url, sort_order, menu_dc)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t ON t.tenant_id = mn.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL')
WHERE mn.menu_code IN ('ST_WAREHOUSE', 'ST_CUSTOMER')
ON CONFLICT (menu_id, permission_id) DO NOTHING;

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mn.menu_id, pm.permission_id
FROM tb_tenant t
JOIN tb_role r ON r.tenant_id = t.tenant_id AND r.role_code = 'PLATFORM_ADMIN'
JOIN tb_menu mn ON mn.tenant_id = t.tenant_id AND mn.menu_code IN ('ST_WAREHOUSE', 'ST_CUSTOMER')
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'EXCEL')
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

COMMIT;
