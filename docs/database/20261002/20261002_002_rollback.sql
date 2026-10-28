-- 20261002_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_002_seed_songyeon_menu.sql 되돌리기
-- 모듈을 지우면 그 메뉴와 tb_menu_permission / tb_role_menu_permission 이 ON DELETE CASCADE 로 함께 지워진다.

BEGIN;

DELETE FROM tb_module m
USING tb_tenant t
WHERE t.tenant_id = m.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND m.module_code IN ('DASH', 'COMM', 'SA', 'CM', 'PD', 'LG', 'SL', 'PU', 'QM', 'RD', 'HA');

COMMIT;
