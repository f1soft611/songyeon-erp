-- 20261103_005_pu_inbound_screens.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 구매관리 > 입고관리 화면의 탭 네 개(입고등록 · 입고현황 · 서류등록 · 반품등록)를 화면(메뉴)으로 나눈다.
--   요청: "입고관리화면에 있는 탭4개 다 화면으로 빼고싶은데" → 메뉴 구성 "제안대로"
--   1) 예전 입고관리 메뉴(IBReceivingView)가 입고등록(IBReceivingRegisterView) 화면이다. 메뉴 번호 · 권한 행은 그대로, 화면ID · 주소 · 이름 · 설명만 바꾼다
--   2) 새 화면 3개를 입고관리 중분류(PU_INBOUND) 아래에 넣는다: 입고현황 20, 서류등록 30, 반품등록 40
--   3) 재료 치환등록(IBSubstitutionView)은 맨 뒤(50)로
--   4) 새 화면 3개의 권한은 입고등록(메뉴 권한 · 역할 권한)을 그대로 복사한다. 탭일 때와 같은 사람이 같은 권한으로 본다
-- 다시 돌려도 결과가 같다.

BEGIN;

UPDATE tb_menu m
SET menu_code = 'IBReceivingRegisterView',
    menu_nm = '입고등록',
    menu_dc = '원재료 입고를 등록해요',
    menu_url = p.menu_url || '/IBReceivingRegisterView',
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t, tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND p.menu_code = 'PU_INBOUND'
  AND m.menu_code = 'IBReceivingView'
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = 'IBReceivingRegisterView');

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, p.menu_id, v.code, v.name, p.menu_url || '/' || v.code, NULL, v.sort_order, 'Y', v.dc
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'PU'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'PU_INBOUND'
CROSS JOIN (VALUES ('IBReceivingStatusView', '입고현황', 20, '기간별 입고 · 반품 현황을 확인해요'),
                   ('IBReceivingDocView',    '서류등록', 30, '입고 건마다 거래명세서 같은 서류를 보관해요'),
                   ('IBReturnRegisterView',  '반품등록', 40, '원재료 반품을 등록해요')) AS v(code, name, sort_order, dc)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu m
SET sort_order = 50,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'IBSubstitutionView'
  AND m.sort_order <> 50;

-- 새 화면 권한 = 입고등록(예전 입고관리) 권한
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT s.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'IBReceivingRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code IN ('IBReceivingStatusView', 'IBReceivingDocView', 'IBReturnRegisterView')
JOIN tb_menu_permission mp ON mp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_menu_permission x WHERE x.menu_id = s.menu_id AND x.permission_id = mp.permission_id);

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, s.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'IBReceivingRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code IN ('IBReceivingStatusView', 'IBReceivingDocView', 'IBReturnRegisterView')
JOIN tb_role_menu_permission rp ON rp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_role_menu_permission x WHERE x.role_id = rp.role_id AND x.menu_id = s.menu_id AND x.permission_id = rp.permission_id);

COMMIT;
