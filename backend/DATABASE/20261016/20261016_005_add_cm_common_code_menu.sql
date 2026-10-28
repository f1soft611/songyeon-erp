-- 20261016_005_add_cm_common_code_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: S_ERP 의 '기준정보 > 기준정보 관리 > 공통코드 관리' 화면을 송연 '공통관리 > 기준정보 > 공통코드 관리' 로 연다.
--       화면 키는 S_ERP 와 같은 cmncodes (S_ERP 주소 /co/master/cmncodes → 송연 /cm/master/cmncodes).
-- 권한 행(tb_menu_permission · tb_role_menu_permission)은 같은 분류의 기초정보(settings)와 똑같이 복사한다.
-- 앞선 작업: 20261016_003 (분류 코드 master) · 20261016_004 (tb_id_sequence, 상세코드 자동 번호)

BEGIN;

-- 1) 공통코드 관리: 기준정보 아래 포장유형(20) 다음
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, p.module_id, p.menu_id, 'cmncodes', '공통코드 관리', '/cm/master/cmncodes', NULL, 30, 'Y', NULL
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'master'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 버튼 권한: 기초정보와 같게
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT n.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'settings'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.menu_code = 'cmncodes'
JOIN tb_menu_permission mp ON mp.menu_id = s.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (menu_id, permission_id) DO NOTHING;

-- 3) 역할별 권한: 기초정보와 같게
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, n.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'settings'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.menu_code = 'cmncodes'
JOIN tb_role_menu_permission rp ON rp.menu_id = s.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

COMMIT;
