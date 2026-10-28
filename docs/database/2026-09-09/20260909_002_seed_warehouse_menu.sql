-- 20260909_002_seed_warehouse_menu.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: '창고관리' 화면(/settings/system/warehouses)을 T1358606250(에프원소프트) 테넌트 사이드바에 등록
-- 참고: 20260831_004_seed_module_menu.sql 관례 (INSERT ... SELECT ... ON CONFLICT DO NOTHING, id 하드코딩 없음)

-- 1) 메뉴 노드: 환경설정 > 시스템 관리(ST_SYSTEM) > 창고관리
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, m.module_id, p.menu_id,
       'ST_WAREHOUSE', '창고관리', '/settings/system/warehouses', NULL, 4, 'Y',
       '테넌트별 창고 마스터(창고명, 사용 여부)를 관리합니다.'
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
JOIN tb_menu   p ON p.tenant_id = t.tenant_id AND p.menu_code   = 'ST_SYSTEM'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 이 메뉴가 지원하는 버튼 권한 (tb_menu_permission): READ / CREATE / UPDATE / DELETE / EXCEL
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t     ON t.tenant_id = mn.tenant_id
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL')
WHERE t.tenant_code = 'T1358606250' AND mn.menu_code = 'ST_WAREHOUSE'
ON CONFLICT (menu_id, permission_id) DO NOTHING;

-- 3) 역할별 부여 권한 (tb_role_menu_permission): PLATFORM_ADMIN → 전체 5권한
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t     ON t.tenant_id = mn.tenant_id
JOIN tb_role   r     ON r.tenant_id = mn.tenant_id AND r.role_code = 'PLATFORM_ADMIN'
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL')
WHERE t.tenant_code = 'T1358606250' AND mn.menu_code = 'ST_WAREHOUSE'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
