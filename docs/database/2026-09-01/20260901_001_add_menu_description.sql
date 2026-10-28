-- 20260901_001_add_menu_description.sql
-- 대상 DB: S-ERP 테넌트 DB (PostgreSQL)

ALTER TABLE tb_menu
  ADD COLUMN IF NOT EXISTS menu_dc varchar(500);
