-- 20261016_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261016_003 되돌리기 — 기준정보 분류 코드 · 주소를 master 에서 standard 로 되돌린다.

BEGIN;

-- 1) 아래 화면 주소
UPDATE tb_menu c
SET menu_url = '/cm/standard/' || substring(c.menu_url FROM length('/cm/master/') + 1),
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'master'
WHERE t.tenant_code = 'SONGYEON'
  AND c.parent_menu_id = p.menu_id
  AND c.menu_url LIKE '/cm/master/%';

-- 2) 분류 코드 · 주소
UPDATE tb_menu p
SET menu_code = 'standard', menu_url = '/cm/standard', updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND p.tenant_id = t.tenant_id
  AND p.menu_code = 'master'
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = 'standard');

COMMIT;
