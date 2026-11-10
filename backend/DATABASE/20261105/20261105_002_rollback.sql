-- 20261105_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261105_002 되돌리기 — 새 화면 2개(표시사항 요청 · 라벨양식)와 품질관리 중분류를 지우고,
--       라벨등록 · 실시간 온도를 모듈 바로 아래(예전 화면ID · 주소 · 순서)로 돌린다.
-- 주의: 화면(DashboardContent 의 화면ID 비교) · 프론트 폴더 · 서버 패키지 · API 주소도 20261105_002 이전으로 함께 돌린다.
-- 새 화면의 권한 행은 tb_menu 를 지우면 FK CASCADE 로 함께 지워진다.
-- 새 화면에 화면검수 기록(tb_screen_review · _history · _draft, FK NO ACTION)이 생겼다면 메뉴를 지우기 전에 그 기록을 먼저 지운다.

BEGIN;

DELETE FROM tb_screen_review_history h
USING tb_screen_review r, tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('LBLabelRequestView', 'LBLabelFormatView')
  AND r.menu_id = m.menu_id AND h.review_id = r.review_id;

DELETE FROM tb_screen_review r
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('LBLabelRequestView', 'LBLabelFormatView')
  AND r.menu_id = m.menu_id;

DELETE FROM tb_screen_review_draft d
USING tb_menu m, tb_tenant t
WHERE t.tenant_code = 'SONGYEON' AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('LBLabelRequestView', 'LBLabelFormatView')
  AND d.menu_id = m.menu_id;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('LBLabelRequestView', 'LBLabelFormatView');

UPDATE tb_menu c
SET parent_menu_id = NULL,
    menu_code = v.old_code,
    menu_url = '/qm/' || v.old_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('LBLabelRegisterView', 'label-register', 1),
             ('TMTempMonitorView',   'temp-monitor',   2)) AS v(new_code, old_code, sort_order)
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.menu_code = v.new_code;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code IN ('QM_LABEL', 'QM_TEMPERATURE')
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.parent_menu_id = m.menu_id);

COMMIT;
