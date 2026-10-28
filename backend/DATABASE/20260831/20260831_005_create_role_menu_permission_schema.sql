-- 20260831_005_create_role_menu_permission_schema.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 역할별 메뉴-버튼 권한 매핑을 신규 생성한다.

CREATE TABLE IF NOT EXISTS tb_role_menu_permission (
  role_id bigint NOT NULL REFERENCES tb_role(role_id) ON DELETE CASCADE,
  menu_id bigint NOT NULL REFERENCES tb_menu(menu_id) ON DELETE CASCADE,
  permission_id bigint NOT NULL REFERENCES tb_permission(permission_id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, menu_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_menu_permission_role
  ON tb_role_menu_permission (role_id);

CREATE INDEX IF NOT EXISTS idx_role_menu_permission_menu
  ON tb_role_menu_permission (menu_id);

CREATE INDEX IF NOT EXISTS idx_role_menu_permission_permission
  ON tb_role_menu_permission (permission_id);
