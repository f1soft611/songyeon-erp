-- 20260831_004_rollback.sql
-- 메뉴 권한 매핑과 권한 마스터만 역순으로 제거한다.

DROP TABLE IF EXISTS tb_menu_permission;
DROP TABLE IF EXISTS tb_permission;