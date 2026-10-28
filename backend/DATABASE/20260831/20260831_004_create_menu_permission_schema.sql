-- 20260831_004_create_menu_permission_schema.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 메뉴별 제공 버튼/기능 권한 마스터 및 허용 권한 매핑 생성

CREATE TABLE IF NOT EXISTS tb_permission (
  permission_id BIGSERIAL PRIMARY KEY,
  permission_code VARCHAR(50) NOT NULL UNIQUE,
  permission_nm VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  use_at CHAR(1) NOT NULL DEFAULT 'Y',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_menu_permission (
  menu_id BIGINT NOT NULL REFERENCES tb_menu(menu_id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES tb_permission(permission_id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (menu_id, permission_id)
);

INSERT INTO tb_permission (permission_code, permission_nm, sort_order)
VALUES
  ('READ', '조회', 10),
  ('CREATE', '등록', 20),
  ('UPDATE', '수정', 30),
  ('DELETE', '삭제', 40),
  ('EXCEL', '엑셀', 50)
ON CONFLICT (permission_code) DO UPDATE
SET permission_nm = EXCLUDED.permission_nm,
    sort_order = EXCLUDED.sort_order,
    use_at = 'Y',
    updated_at = NOW();