-- 20261028_003_sales_module_categories.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 영업관리 모듈 주소를 /sa → /sales(S_ERP 와 같음)로 바꾸고, 기준정보처럼 중분류를 두어 화면을 그 아래로 옮긴다
--       (2026-10-28 요청 "영업관리 sa 로 되어있는거 sales로 바꾸고 기준정보처럼 중분류도 넣고싶은데", 사용자 결정: 중분류 3개)
--   1) tb_module: module_code SA → SALES, module_url /sa → /sales
--   2) 중분류(권한 행 없음, 기준정보 중분류와 같은 모양)
--        SALES_PRODUCT  제품관리 /sales/product   순서 1
--        SALES_ORDER    수주관리 /sales/order     순서 2
--        SALES_SHIPMENT 출하관리 /sales/shipment  순서 3
--   3) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 + 화면 뜻(영어) + View (기준정보 BS…View, 스케줄관리 SC…View 와 같은 규칙)
--        제품관리 PM: product → PMProductRegisterView(10), pricing → PMPricingView(20)
--        수주관리 OM: quote → OMQuoteView(10), order → OMOrderRegisterView(20), prod-check → OMProdCheckView(30)
--        출하관리 SH: shipment → SHShipmentRegisterView(10)
--   - 메뉴 번호 · 이름 · 권한 행(tb_menu_permission · tb_role_menu_permission)은 그대로다.
-- 다시 돌려도 결과가 같다.

BEGIN;

UPDATE tb_module md
SET module_code = 'SALES',
    module_url = '/sales',
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND md.tenant_id = t.tenant_id
  AND md.module_code = 'SA';

-- 화면ID 를 먼저 바꾼다(중분류 코드와 겹치지 않게)
UPDATE tb_menu m
SET menu_code = v.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('product',    'PMProductRegisterView'),
             ('pricing',    'PMPricingView'),
             ('quote',      'OMQuoteView'),
             ('order',      'OMOrderRegisterView'),
             ('prod-check', 'OMProdCheckView'),
             ('shipment',   'SHShipmentRegisterView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.module_id = (SELECT md.module_id FROM tb_module md WHERE md.tenant_id = t.tenant_id AND md.module_code = 'SALES')
  AND m.menu_code = v.old_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.new_code);

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, v.code, v.name, v.url, NULL, v.sort_order, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'SALES'
CROSS JOIN (VALUES ('SALES_PRODUCT',  '제품관리', '/sales/product',  1),
                   ('SALES_ORDER',    '수주관리', '/sales/order',    2),
                   ('SALES_SHIPMENT', '출하관리', '/sales/shipment', 3)) AS v(code, name, url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = p.menu_url || '/' || c.menu_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('PMProductRegisterView',  'SALES_PRODUCT',  10),
             ('PMPricingView',          'SALES_PRODUCT',  20),
             ('OMQuoteView',            'SALES_ORDER',    10),
             ('OMOrderRegisterView',    'SALES_ORDER',    20),
             ('OMProdCheckView',        'SALES_ORDER',    30),
             ('SHShipmentRegisterView', 'SALES_SHIPMENT', 10)) AS v(code, parent_code, sort_order),
     tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND c.menu_code = v.code
  AND p.menu_code = v.parent_code
  AND (c.parent_menu_id IS DISTINCT FROM p.menu_id OR c.menu_url <> p.menu_url || '/' || c.menu_code OR c.sort_order <> v.sort_order);

COMMIT;
