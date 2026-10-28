-- 20261019_014_restore_co_master_menus.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리의 분류 '기초정보'(menu_code master)가 지워지면서(하위 메뉴는 parent FK ON DELETE CASCADE 로 함께,
--       권한 행도 menu FK CASCADE 로 함께) 사라진 메뉴 9개를 다시 만든다(2026-10-19).
--   - 분류: master '기초정보' /co/master 순서 1 (20261016_001 · 003 · 006 과 같은 값, 권한 행 없음)
--   - 화면 8개: 20261016_002 · 005, 20261019_004 · 008 ~ 012 와 같은 코드 · 이름 · 주소 · 순서
--   - 권한 행: 지운 기초정보(settings)와 같은 5개(permission_id 10 ~ 14)를 같은 모듈의 생산스케줄(production)에서 복사한다.
--     (원래 스크립트들은 settings 에서 복사했지만 settings 는 20261019_013 에서 지웠다. 두 메뉴의 권한 행은 같다)
--   - menu_id 는 새로 매긴다(옛 번호를 가리키는 다른 표는 없다: tb_board_type 0행).
-- 다시 돌려도 결과가 같다(ON CONFLICT DO NOTHING).

BEGIN;

-- 1) 분류
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, 'master', '기초정보', '/co/master', NULL, 1, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'CO'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 화면
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, p.module_id, p.menu_id, v.menu_code, v.menu_nm, v.menu_url, NULL, v.sort_order, 'Y', NULL
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'master'
CROSS JOIN (VALUES
    ('BSBoxTypeView',           '포장유형',          '/co/master/BSBoxTypeView',           20),
    ('cmncodes',                '공통코드 관리',     '/co/master/cmncodes',                30),
    ('BSWarehouseView',         '창고등록',          '/co/master/BSWarehouseView',         40),
    ('BSItemMasterView',        '제품마스터',        '/co/master/BSItemMasterView',        50),
    ('BSPartnerMasterView',     '거래처마스터',      '/co/master/BSPartnerMasterView',     60),
    ('BSPartnerItemView',       '거래처별 제품조회', '/co/master/BSPartnerItemView',       70),
    ('BSMaterialMasterView',    '원재료마스터',      '/co/master/BSMaterialMasterView',    80),
    ('BSSubMaterialMasterView', '부자재마스터',      '/co/master/BSSubMaterialMasterView', 90)
) AS v(menu_code, menu_nm, menu_url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 3) 권한 행(생산스케줄과 같게)
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT n.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'production'
JOIN tb_menu_permission mp ON mp.menu_id = s.menu_id
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'master'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.parent_menu_id = p.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (menu_id, permission_id) DO NOTHING;

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, n.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'production'
JOIN tb_role_menu_permission rp ON rp.menu_id = s.menu_id
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'master'
JOIN tb_menu n ON n.tenant_id = t.tenant_id AND n.parent_menu_id = p.menu_id
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

COMMIT;
