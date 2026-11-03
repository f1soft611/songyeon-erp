-- 20261103_005_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261103_005 되돌리기 — 새 화면 3개(입고현황 · 서류등록 · 반품등록)를 지우고, 입고등록을 예전 입고관리(화면ID · 주소 · 이름 · 설명)로, 재료 치환등록 순서를 20으로 돌린다.
-- 주의: 화면(DashboardContent 화면ID, 입고관리 탭) · 프론트 폴더도 20261103_005 이전으로 함께 돌린다.
-- 새 화면의 권한 행은 tb_menu 를 지우면 FK CASCADE 로 함께 지워진다.
-- 새 화면에 화면검수 기록(tb_screen_review · _history · _draft, FK NO ACTION)이 생겼다면 메뉴를 지우기 전에 그 기록을 먼저 지운다.

BEGIN;

DELETE FROM tb_screen_review_history h
USING tb_screen_review r, tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('IBReceivingStatusView', 'IBReceivingDocView', 'IBReturnRegisterView')
  AND r.menu_id = m.menu_id AND h.review_id = r.review_id;

DELETE FROM tb_screen_review r
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('IBReceivingStatusView', 'IBReceivingDocView', 'IBReturnRegisterView')
  AND r.menu_id = m.menu_id;

DELETE FROM tb_screen_review_draft d
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('IBReceivingStatusView', 'IBReceivingDocView', 'IBReturnRegisterView')
  AND d.menu_id = m.menu_id;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('IBReceivingStatusView', 'IBReceivingDocView', 'IBReturnRegisterView');

UPDATE tb_menu m
SET menu_code = 'IBReceivingView',
    menu_nm = '입고관리',
    menu_dc = '원재료 입고 등록, 기간별 입고현황, 거래명세서 같은 서류 보관, 반품 등록을 해요',
    menu_url = p.menu_url || '/IBReceivingView',
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t, tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND p.menu_code = 'PU_INBOUND'
  AND m.menu_code = 'IBReceivingRegisterView';

UPDATE tb_menu m
SET sort_order = 20,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'IBSubstitutionView';

COMMIT;
