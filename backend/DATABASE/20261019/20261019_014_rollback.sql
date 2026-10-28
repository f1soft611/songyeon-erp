-- 20261019_014_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_014 되돌리기 — 다시 만든 분류 '기초정보'(master)와 그 아래 화면 메뉴 8개, 그 권한 행을 지운다.
-- 주의: 하위 메뉴 · 권한 행은 FK ON DELETE CASCADE 로 함께 지워진다(이번 사고와 같은 모양). 되돌린 뒤에는 공통관리 > 기초정보 메뉴가 없다.

BEGIN;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON'
  AND m.menu_code IN ('BSBoxTypeView', 'cmncodes', 'BSWarehouseView', 'BSItemMasterView', 'BSPartnerMasterView',
                      'BSPartnerItemView', 'BSMaterialMasterView', 'BSSubMaterialMasterView', 'master');

COMMIT;
