-- 20261016_006_rename_cm_module_to_co.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리 모듈 코드 · 주소를 cm 에서 co 로 바꾼다(S_ERP 기준정보 모듈 /co 와 같게).
--       tb_module: module_code CM → CO, module_url /cm → /co
--       tb_menu  : 공통관리 메뉴 주소 /cm/... → /co/...
-- 화면 키(주소 마지막 칸) · menu_id · 권한 행은 그대로다. 코드 쪽(패키지 · 폴더 · API /api/v1/co/...)은 같은 날 함께 옮겼다.

BEGIN;

-- 1) 메뉴 주소
UPDATE tb_menu m
SET menu_url = '/co' || substring(m.menu_url FROM 4), updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'CM'
WHERE t.tenant_code = 'SONGYEON'
  AND m.module_id = md.module_id
  AND (m.menu_url = '/cm' OR m.menu_url LIKE '/cm/%');

-- 2) 모듈 코드 · 주소 (CO 가 이미 있으면 바꾸지 않는다)
UPDATE tb_module md
SET module_code = 'CO', module_url = '/co', updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND md.tenant_id = t.tenant_id
  AND md.module_code = 'CM'
  AND NOT EXISTS (SELECT 1 FROM tb_module x WHERE x.tenant_id = t.tenant_id AND x.module_code = 'CO');

COMMIT;
