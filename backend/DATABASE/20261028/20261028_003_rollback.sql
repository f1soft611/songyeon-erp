-- 20261028_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261028_003 되돌리기 — 영업관리를 /sa 로 돌리고, 중분류를 지우고, 화면을 모듈 바로 아래(예전 화면 키 · 주소 · 순서)로 돌린다.
-- 주의: 화면(DashboardContent 의 'sales' · 화면ID 비교, 화면 간 이동 주소)도 20261028_003 이전으로 함께 돌린다.

BEGIN;

UPDATE tb_menu c
SET parent_menu_id = NULL,
    menu_code = v.old_code,
    menu_url = '/sa/' || v.old_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('PMProductRegisterView',  'product',    1),
             ('PMPricingView',          'pricing',    2),
             ('OMQuoteView',            'quote',      3),
             ('OMOrderRegisterView',    'order',      4),
             ('SHShipmentRegisterView', 'shipment',   5),
             ('OMProdCheckView',        'prod-check', 6)) AS v(new_code, old_code, sort_order)
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.menu_code = v.new_code;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('SALES_PRODUCT', 'SALES_ORDER', 'SALES_SHIPMENT')
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.parent_menu_id = m.menu_id);

UPDATE tb_module md
SET module_code = 'SA',
    module_url = '/sa',
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND md.tenant_id = t.tenant_id
  AND md.module_code = 'SALES';

COMMIT;
