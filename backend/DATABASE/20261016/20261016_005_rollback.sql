-- 20261016_005_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261016_005 되돌리기 — 공통코드 관리(cmncodes) 메뉴와 그 권한 행을 지운다. 공통코드 자료(tb_common_code_*)는 건드리지 않는다.

BEGIN;

DELETE FROM tb_role_menu_permission rp
USING tb_menu m, tb_tenant t
WHERE rp.menu_id = m.menu_id AND m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'cmncodes';

DELETE FROM tb_menu_permission mp
USING tb_menu m, tb_tenant t
WHERE mp.menu_id = m.menu_id AND m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'cmncodes';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'cmncodes';

COMMIT;
