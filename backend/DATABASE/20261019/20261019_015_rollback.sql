-- 20261019_015_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_015 되돌리기 — 생산스케줄 · 물류스케줄을 공통관리 맨 위로 되돌리고(주소 /co/production · /co/logistics, 순서 2 · 3)
--       분류 '스케줄관리'(schedule)를 지운다.
-- 주의: 하위 메뉴는 parent FK ON DELETE CASCADE 라, 반드시 화면을 먼저 밖으로 뺀 뒤 분류를 지운다(순서를 바꾸면 화면 메뉴도 지워진다).

BEGIN;

UPDATE tb_menu c
SET parent_menu_id = NULL,
    menu_url = '/co/' || c.menu_code,
    sort_order = CASE c.menu_code WHEN 'production' THEN 2 ELSE 3 END,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.menu_code IN ('production', 'logistics');

DELETE FROM tb_menu m
USING tb_tenant t
WHERE m.tenant_id = t.tenant_id AND t.tenant_code = 'SONGYEON'
  AND m.menu_code = 'schedule'
  AND NOT EXISTS (SELECT 1 FROM tb_menu c WHERE c.parent_menu_id = m.menu_id);

COMMIT;
