-- 20261016_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261016_002 되돌리기 — 포장유형(BSBoxTypeView) 메뉴를 지우고 기초정보 설명을 되돌린다.
-- tb_menu_permission · tb_role_menu_permission 은 tb_menu 삭제 시 함께 지워진다(ON DELETE CASCADE). 지우기 전에 명시적으로 먼저 지운다.

BEGIN;

DELETE FROM tb_role_menu_permission rp
USING tb_menu m, tb_tenant t
WHERE rp.menu_id = m.menu_id AND m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'BSBoxTypeView';

DELETE FROM tb_menu_permission mp
USING tb_menu m, tb_tenant t
WHERE mp.menu_id = m.menu_id AND m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'BSBoxTypeView';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON' AND m.menu_code = 'BSBoxTypeView';

UPDATE tb_menu m
SET menu_dc = '포장유형별 고정값, 확정 제품의 배합비(BOM) 관리', updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id AND m.menu_code = 'settings'
  AND m.menu_dc = '확정 제품의 배합비(BOM) 관리';

COMMIT;
