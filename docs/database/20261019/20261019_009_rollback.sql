-- 20261019_009_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_009 되돌리기 — 거래처마스터(BSPartnerMasterView) 메뉴와 그 권한 행을 지운다. 거래처 자료는 건드리지 않는다.
-- 주의: 코드(기초정보 거래처BOM 탭)도 함께 되돌려야 거래처를 고칠 화면이 생긴다.

BEGIN;

DELETE FROM tb_role_menu_permission rp
USING tb_menu m, tb_tenant t
WHERE rp.menu_id = m.menu_id AND m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'BSPartnerMasterView';

DELETE FROM tb_menu_permission mp
USING tb_menu m, tb_tenant t
WHERE mp.menu_id = m.menu_id AND m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'BSPartnerMasterView';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'BSPartnerMasterView';

COMMIT;
