-- 20261106_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261106_002 되돌리기 — 화면 'HACCP(선행)' 과 중분류 'HACCP' 를 지운다.
-- HACCP(선행)의 권한 행은 tb_menu 를 지우면 FK CASCADE 로 함께 지워진다.
-- 화면검수 기록(tb_screen_review · _history · _draft, FK NO ACTION)이 생겼다면 메뉴를 지우기 전에 먼저 지운다.
-- 화면(DashboardContent 의 화면ID 비교) · 프론트 폴더 pages/qm/haccp 도 함께 돌린다.

BEGIN;

DELETE FROM tb_screen_review_history h
USING tb_screen_review r, tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'HCPrerequisiteView'
  AND r.menu_id = m.menu_id AND h.review_id = r.review_id;

DELETE FROM tb_screen_review r
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'HCPrerequisiteView'
  AND r.menu_id = m.menu_id;

DELETE FROM tb_screen_review_draft d
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'HCPrerequisiteView'
  AND d.menu_id = m.menu_id;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'HCPrerequisiteView';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'QM_HACCP'
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.parent_menu_id = m.menu_id);

COMMIT;
