-- 20261106_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261106_001 되돌리기 — 화면 '제품검사' 와 중분류 '품질검사' 를 지운다.
-- 제품검사의 권한 행은 tb_menu 를 지우면 FK CASCADE 로 함께 지워진다.
-- 화면검수 기록(tb_screen_review · _history · _draft, FK NO ACTION)이 생겼다면 메뉴를 지우기 전에 먼저 지운다.
-- 화면(DashboardContent 의 화면ID 비교) · 프론트 폴더 pages/qm/inspection 도 함께 돌린다.

BEGIN;

DELETE FROM tb_screen_review_history h
USING tb_screen_review r, tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'QIProductInspectionView'
  AND r.menu_id = m.menu_id AND h.review_id = r.review_id;

DELETE FROM tb_screen_review r
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'QIProductInspectionView'
  AND r.menu_id = m.menu_id;

DELETE FROM tb_screen_review_draft d
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'QIProductInspectionView'
  AND d.menu_id = m.menu_id;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'QIProductInspectionView';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'QM_INSPECTION'
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.parent_menu_id = m.menu_id);

COMMIT;
