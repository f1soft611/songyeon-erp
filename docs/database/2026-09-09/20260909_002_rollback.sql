-- 20260909_002_rollback.sql
-- 주의: '창고관리' 메뉴(ST_WAREHOUSE)와 그 권한 매핑이 삭제됩니다.
--       tb_menu 삭제 시 FK ON DELETE CASCADE 로 tb_menu_permission / tb_role_menu_permission 도 함께 삭제됨.

DELETE FROM tb_menu
WHERE menu_code = 'ST_WAREHOUSE'
  AND tenant_id = (SELECT tenant_id FROM tb_tenant WHERE tenant_code = 'T1358606250');
