-- 20260831_003_rollback.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 20260831_003/004 스크립트로 생성된 모듈/메뉴 스키마 및 시드 데이터 롤백

DELETE FROM tb_menu
WHERE tenant_id IN (SELECT tenant_id FROM tb_tenant WHERE tenant_code = 'T1358606250')
  AND menu_code IN ('GW_OVERVIEW', 'GW_DOCUMENTS', 'ST_SYSTEM', 'ST_ROLES', 'ST_MENUS', 'ST_F1_GRID_TEST');

DELETE FROM tb_module
WHERE tenant_id IN (SELECT tenant_id FROM tb_tenant WHERE tenant_code = 'T1358606250')
  AND module_code IN ('GROUPWARE', 'SETTINGS');

DROP TABLE IF EXISTS tb_menu;
DROP TABLE IF EXISTS tb_module;
