-- 20261002_004_remove_settings_warehouse_customer_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 환경설정 > 시스템 관리 에서 창고관리(ST_WAREHOUSE)·고객정보(ST_CUSTOMER) 메뉴를 없앤다(2026-10-02 요청).
--   송연 창고는 공통관리 > 기초정보 > 창고등록 에서 관리한다(S_ERP 창고관리 tb_warehouse 와 다른 표).
--   메뉴를 지우면 메뉴별 기능(tb_menu_permission)·역할별 권한(tb_role_menu_permission)도 ON DELETE CASCADE 로 함께 지워진다.
--   화면 코드(S_ERP 창고관리 페이지 등)는 그대로 두며, 메뉴가 없어 들어갈 수 없다.
-- 선행: 20261002_001_seed_songyeon_settings_menu.sql

BEGIN;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('ST_WAREHOUSE', 'ST_CUSTOMER');

COMMIT;
