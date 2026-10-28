-- 20261016_002_add_cm_box_type_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리 > 기준정보 아래에 '포장유형' 화면(화면ID BSBoxTypeView)을 만든다. 기초정보의 포장유형 탭을 화면으로 뺀 것이다.
--       화면ID 는 menu_code 이고, 주소의 마지막 칸(화면 키)도 같은 값이다.
-- 권한 행(tb_menu_permission · tb_role_menu_permission)은 같은 표를 다루던 기초정보(settings)와 똑같이 복사한다.
-- 기초정보 설명에서 '포장유형별 고정값' 을 뺀다(탭이 없어졌다).
-- 앞선 작업: 20261016_001 (분류 '기준정보' standard)

BEGIN;

-- 1) 포장유형 화면: 기준정보 아래 기초정보(10) 다음
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, p.module_id, p.menu_id, 'BSBoxTypeView', '포장유형', '/cm/standard/BSBoxTypeView', NULL, 20, 'Y', '포장유형별 고정값 관리'
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'standard'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 버튼 권한: 기초정보와 같게
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT n.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'settings'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.menu_code = 'BSBoxTypeView'
JOIN tb_menu_permission mp ON mp.menu_id = s.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (menu_id, permission_id) DO NOTHING;

-- 3) 역할별 권한: 기초정보와 같게
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, n.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'settings'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.menu_code = 'BSBoxTypeView'
JOIN tb_role_menu_permission rp ON rp.menu_id = s.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

-- 4) 기초정보 설명: 포장유형이 빠졌다
UPDATE tb_menu m
SET menu_dc = '확정 제품의 배합비(BOM) 관리', updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id AND m.menu_code = 'settings'
  AND m.menu_dc = '포장유형별 고정값, 확정 제품의 배합비(BOM) 관리';

COMMIT;
