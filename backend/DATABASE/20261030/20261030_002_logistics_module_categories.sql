-- 20261030_002_logistics_module_categories.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 물류관리(/lg)에 생산관리처럼 중분류를 두어 화면을 그 아래로 옮긴다
--       (2026-10-30 요청 "물류관리 도 중분류 필요해", 사용자 결정: 재고관리 / 출고관리 · 폴더 · API · 화면ID 까지 맞춤 · 표준 구조 정리)
--   1) 모듈은 그대로(LG /lg. S_ERP 에 물류관리 모듈이 없어 주소를 바꾸지 않는다)
--   2) 중분류(권한 행 없음, 영업관리 · 생산관리 중분류와 같은 모양)
--        LG_STOCK    재고관리 /lg/stock     순서 1
--        LG_OUTBOUND 출고관리 /lg/outbound  순서 2  (영업관리 > 출하관리와 이름이 겹치지 않게 '출고관리')
--   3) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 + 화면 뜻(영어) + View
--        재고관리 ST: product-stock → STProductStockView(10)
--        출고관리 OB: ship-confirm → OBShipConfirmView(10), ship-status → OBShipStatusView(20)
--   - 메뉴 번호 · 이름 · 권한 행(tb_menu_permission · tb_role_menu_permission)은 그대로다.
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 화면ID 를 먼저 바꾼다(중분류 코드와 겹치지 않게)
UPDATE tb_menu m
SET menu_code = v.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('product-stock', 'STProductStockView'),
             ('ship-confirm',  'OBShipConfirmView'),
             ('ship-status',   'OBShipStatusView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.module_id = (SELECT md.module_id FROM tb_module md WHERE md.tenant_id = t.tenant_id AND md.module_code = 'LG')
  AND m.menu_code = v.old_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.new_code);

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, v.code, v.name, v.url, NULL, v.sort_order, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'LG'
CROSS JOIN (VALUES ('LG_STOCK',    '재고관리', '/lg/stock',    1),
                   ('LG_OUTBOUND', '출고관리', '/lg/outbound', 2)) AS v(code, name, url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = p.menu_url || '/' || c.menu_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('STProductStockView', 'LG_STOCK',    10),
             ('OBShipConfirmView',  'LG_OUTBOUND', 10),
             ('OBShipStatusView',   'LG_OUTBOUND', 20)) AS v(code, parent_code, sort_order),
     tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND c.menu_code = v.code
  AND p.menu_code = v.parent_code
  AND (c.parent_menu_id IS DISTINCT FROM p.menu_id OR c.menu_url <> p.menu_url || '/' || c.menu_code OR c.sort_order <> v.sort_order);

COMMIT;
