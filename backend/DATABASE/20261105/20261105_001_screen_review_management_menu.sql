-- 20261105_001_screen_review_management_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 환경설정 > 시스템 관리 > 메뉴관리(순서 30) 밑에 화면검수 관리 화면 메뉴를 넣는다.
--   요청: 화면 이미지 '프로젝트 화면검수 관리' — "환경설정에 메뉴관리 밑에 만들거고"
--   1) 메뉴 ST_SCREEN_REVIEWS(화면검수 관리, /settings/system/screen-reviews, 순서 35). F1 Grid 테스트(40)는 그대로
--   2) 권한(메뉴 권한 · 역할 권한)은 메뉴관리(ST_MENUS)를 그대로 복사한다
-- 다시 돌려도 결과가 같다.

BEGIN;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, p.module_id, p.menu_id, 'ST_SCREEN_REVIEWS', '화면검수 관리', p.menu_url || '/screen-reviews', NULL, 35, 'Y',
       '메뉴 · 화면별 검수 상태를 한 번에 확인해요'
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'ST_SYSTEM'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 새 화면 권한 = 메뉴관리 권한
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT s.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'ST_MENUS'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'ST_SCREEN_REVIEWS'
JOIN tb_menu_permission mp ON mp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_menu_permission x WHERE x.menu_id = s.menu_id AND x.permission_id = mp.permission_id);

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, s.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'ST_MENUS'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'ST_SCREEN_REVIEWS'
JOIN tb_role_menu_permission rp ON rp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_role_menu_permission x WHERE x.role_id = rp.role_id AND x.menu_id = s.menu_id AND x.permission_id = rp.permission_id);

COMMIT;
