-- 20260901_001_add_menu_description.sql
-- 대상 DB: S-ERP 테넌트 DB (PostgreSQL)
-- 목적: 메뉴 관리에서 메뉴설명을 별도 저장하고 사용자 메뉴 API로 제공

ALTER TABLE tb_menu
  ADD COLUMN IF NOT EXISTS menu_dc varchar(500);
