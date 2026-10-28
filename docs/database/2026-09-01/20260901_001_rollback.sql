-- 20260901_001_rollback.sql

ALTER TABLE tb_menu
  DROP COLUMN IF EXISTS menu_dc;
