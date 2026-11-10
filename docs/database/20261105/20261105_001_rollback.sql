-- 20261105_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261105_001 되돌리기 — 화면검수 관리 메뉴(ST_SCREEN_REVIEWS)를 지운다.
-- 권한 행은 tb_menu 를 지우면 FK CASCADE 로 함께 지워진다.
-- 이 화면에 화면검수 기록(tb_screen_review · _history · _draft, FK NO ACTION)이 생겼다면 메뉴를 지우기 전에 그 기록을 먼저 지운다.
-- 주의: 화면(DashboardContent 의 screen-reviews) · 서버 목록 API 는 메뉴가 없으면 열리지 않을 뿐 다른 화면에 영향이 없다.

BEGIN;

DELETE FROM tb_screen_review_history h
USING tb_screen_review r, tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'ST_SCREEN_REVIEWS'
  AND r.menu_id = m.menu_id AND h.review_id = r.review_id;

DELETE FROM tb_screen_review r
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'ST_SCREEN_REVIEWS'
  AND r.menu_id = m.menu_id;

DELETE FROM tb_screen_review_draft d
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'ST_SCREEN_REVIEWS'
  AND d.menu_id = m.menu_id;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'ST_SCREEN_REVIEWS';

COMMIT;
