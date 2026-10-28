-- 20261022_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261022_001 되돌리기 — '홈' 이름을 '대시보드'로, 메신저·AI 모듈을 다시 사용으로.

BEGIN;

UPDATE tb_module mo
SET module_nm = '대시보드', updated_at = now()
FROM tb_tenant t
WHERE t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = 'DASH';

UPDATE tb_menu m
SET menu_nm = '대시보드', updated_at = now()
FROM tb_module mo, tb_tenant t
WHERE mo.module_id = m.module_id
  AND t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = 'DASH'
  AND m.menu_code = 'dashboard';

UPDATE tb_module mo
SET use_at = 'Y', updated_at = now()
FROM tb_tenant t
WHERE t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = 'COMM';

COMMIT;
