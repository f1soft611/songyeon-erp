-- 20261102_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261102_002 되돌리기 — 새 화면 발주현황과 중분류를 지우고, 화면을 모듈 바로 아래(예전 화면 키 · 주소 · 순서 · 이름)로 돌린다.
-- 주의: 화면(DashboardContent 의 화면ID 비교, 발주관리 탭) · 프론트 폴더 · 서버 패키지 · API 주소도 20261102_002 이전으로 함께 돌린다.
-- 발주현황의 권한 행은 tb_menu 를 지우면 FK CASCADE 로 함께 지워진다.

BEGIN;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'POOrderStatusView';

UPDATE tb_menu c
SET parent_menu_id = NULL,
    menu_code = v.old_code,
    menu_url = '/pu/' || v.old_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('POOrderRegisterView', 'po',           1),
             ('IBReceivingView',     'recv',         2),
             ('IBSubstitutionView',  'mat-sub',      3),
             ('STStockLedgerView',   'purchase',     4),
             ('STStockAdjustView',   'stock',        5),
             ('STStockStatusView',   'stock-status', 6),
             ('DCDocumentBoxView',   'documents',    7)) AS v(new_code, old_code, sort_order)
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.menu_code = v.new_code;

UPDATE tb_menu m
SET menu_nm = '발주관리',
    menu_dc = '원재료 발주를 등록하고, 기간별 발주현황을 확인해요',
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'po';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('PU_ORDER', 'PU_INBOUND', 'PU_STOCK', 'PU_DOCUMENT')
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.parent_menu_id = m.menu_id);

COMMIT;
