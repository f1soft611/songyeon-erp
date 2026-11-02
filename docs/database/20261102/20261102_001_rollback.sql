-- 20261102_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261102_001 되돌리기 — 판매관리 중분류를 지우고, 화면을 모듈 바로 아래(예전 화면 키 · 주소 · 순서)로 돌린다.
-- 주의: 화면(DashboardContent 의 화면ID 비교) · 프론트 폴더 · 서버 패키지 · API 주소도 20261102_001 이전으로 함께 돌린다.

BEGIN;

UPDATE tb_menu c
SET parent_menu_id = NULL,
    menu_code = v.old_code,
    menu_url = '/sl/' || v.old_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('ENSalesRegisterView', 'sales-register', 1),
             ('INSalesStatusView',   'sales-status',   2),
             ('INSalesTotalView',    'sales-total',    3)) AS v(new_code, old_code, sort_order)
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.menu_code = v.new_code;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('SL_ENTRY', 'SL_INQUIRY')
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.parent_menu_id = m.menu_id);

COMMIT;
