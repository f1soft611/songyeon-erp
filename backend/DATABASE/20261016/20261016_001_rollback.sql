-- 20261016_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261016_001 되돌리기 — 기초정보를 공통관리 바로 아래(맨 앞)로 되돌리고 분류 '기준정보' 를 지운다.
-- 주의: tb_menu.parent_menu_id 는 ON DELETE CASCADE 다. 분류를 지우기 전에 반드시 기초정보를 먼저 떼어낸다(아니면 기초정보와 그 권한 행까지 지워진다).

BEGIN;

-- 1) 기초정보를 원래 자리로
UPDATE tb_menu c
SET parent_menu_id = NULL,
    menu_url = '/cm/settings',
    sort_order = 1,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.menu_code = 'settings';

-- 2) 자식이 없을 때만 분류를 지운다
DELETE FROM tb_menu p
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND p.tenant_id = t.tenant_id
  AND p.menu_code = 'standard'
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.parent_menu_id = p.menu_id);

COMMIT;
