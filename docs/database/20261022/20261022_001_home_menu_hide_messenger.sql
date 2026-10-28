-- 20261022_001_home_menu_hide_messenger.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 왼쪽 메뉴 '대시보드'를 '홈'으로 바꾸고, 메신저·AI 모듈을 사용안함으로 둔다(2026-10-22 요청: "대시보드를 … 홈으로. 메신저AI는 빼고").
--   - 데이터만 바꾼다(표 구조 그대로).
--   - DASH 모듈 이름 · 그 아래 dashboard 메뉴 이름 → '홈'. menu_code · menu_url 은 그대로라 화면 연결도 그대로다.
--   - COMM(메신저·AI) 모듈 use_at = 'N'. 내 메뉴는 사용 중인 모듈만 내려주므로 왼쪽에서 사라진다. 메뉴 · 권한 줄은 지우지 않는다.
-- 다시 돌려도 결과가 같다.

BEGIN;

UPDATE tb_module mo
SET module_nm = '홈', updated_at = now()
FROM tb_tenant t
WHERE t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = 'DASH'
  AND mo.module_nm <> '홈';

UPDATE tb_menu m
SET menu_nm = '홈', updated_at = now()
FROM tb_module mo, tb_tenant t
WHERE mo.module_id = m.module_id
  AND t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = 'DASH'
  AND m.menu_code = 'dashboard'
  AND m.menu_nm <> '홈';

UPDATE tb_module mo
SET use_at = 'N', updated_at = now()
FROM tb_tenant t
WHERE t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = 'COMM'
  AND mo.use_at <> 'N';

COMMIT;
