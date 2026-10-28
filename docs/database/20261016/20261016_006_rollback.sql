-- 20261016_006_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261016_006 되돌리기 — 공통관리 모듈 코드 · 주소를 co 에서 cm 으로 되돌린다.
-- 주의: 코드(패키지 · 폴더 · API /api/v1/co/...)도 함께 되돌려야 화면이 맞게 열린다.

BEGIN;

UPDATE tb_menu m
SET menu_url = '/cm' || substring(m.menu_url FROM 4), updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'CO'
WHERE t.tenant_code = 'SONGYEON'
  AND m.module_id = md.module_id
  AND (m.menu_url = '/co' OR m.menu_url LIKE '/co/%');

UPDATE tb_module md
SET module_code = 'CM', module_url = '/cm', updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND md.tenant_id = t.tenant_id
  AND md.module_code = 'CO'
  AND NOT EXISTS (SELECT 1 FROM tb_module x WHERE x.tenant_id = t.tenant_id AND x.module_code = 'CM');

COMMIT;
