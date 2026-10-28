-- 20261019_013_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_013 되돌리기 — 백업해 둔 기초정보(settings) 메뉴와 권한 행을 같은 번호로 되살리고 백업 표를 지운다.
-- 주의: 코드(기초정보 화면 BasicInfoPage · 서버관리 탭 · 서버관리 API)도 함께 되돌려야 화면이 열린다.

BEGIN;

INSERT INTO tb_menu
OVERRIDING SYSTEM VALUE
SELECT b.* FROM bak_20261019_013_menu b
ON CONFLICT DO NOTHING;

INSERT INTO tb_menu_permission
SELECT b.* FROM bak_20261019_013_menu_permission b
ON CONFLICT DO NOTHING;

INSERT INTO tb_role_menu_permission
SELECT b.* FROM bak_20261019_013_role_menu_permission b
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS bak_20261019_013_role_menu_permission;
DROP TABLE IF EXISTS bak_20261019_013_menu_permission;
DROP TABLE IF EXISTS bak_20261019_013_menu;

COMMIT;
