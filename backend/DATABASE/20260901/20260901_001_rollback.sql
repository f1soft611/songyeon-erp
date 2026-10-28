-- 20260901_001_rollback.sql
-- 주의: 저장된 메뉴설명 데이터가 삭제됩니다.

ALTER TABLE tb_menu
  DROP COLUMN IF EXISTS menu_dc;
