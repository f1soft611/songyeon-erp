-- 20261002_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_001_seed_songyeon_settings_menu.sql 되돌리기
-- 테넌트를 지우면 tb_role/tb_module/tb_menu 와 그 매핑(tb_menu_permission, tb_role_menu_permission)이 ON DELETE CASCADE 로 함께 지워진다.
-- tb_permission 은 전역 표이므로, 다른 테넌트의 메뉴가 쓰지 않는 경우에만 지운다.

BEGIN;

DELETE FROM tb_tenant WHERE tenant_code = 'SONGYEON';

DELETE FROM tb_permission p
WHERE p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL',
                            'BOARD_VIEW', 'BOARD_WRITE', 'BOARD_DELETE', 'BOARD_UPLOAD')
  AND NOT EXISTS (SELECT 1 FROM tb_menu_permission mp WHERE mp.permission_id = p.permission_id)
  AND NOT EXISTS (SELECT 1 FROM tb_role_menu_permission rmp WHERE rmp.permission_id = p.permission_id);

COMMIT;
