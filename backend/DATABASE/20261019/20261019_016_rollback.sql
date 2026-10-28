-- 20261019_016_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_016 되돌리기 — 화면ID 를 production · logistics 로, 주소를 /co/schedule/production · /co/schedule/logistics 로 되돌린다.
-- 주의: 화면 코드(DashboardContent 의 화면 키)도 함께 되돌려야 화면이 열린다.

BEGIN;

UPDATE tb_menu m
SET menu_code = v.old_code,
    menu_url = '/co/schedule/' || v.old_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('production', 'SCProductionScheduleView'),
             ('logistics',  'SCLogisticsScheduleView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = v.new_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.old_code);

COMMIT;
