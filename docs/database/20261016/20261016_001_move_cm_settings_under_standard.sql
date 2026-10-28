-- 20261016_001_move_cm_settings_under_standard.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리 > 기초정보(화면)를 S_ERP 처럼 분류 아래로 옮긴다.
--       공통관리[모듈] > 기준정보[분류] > 기초정보[화면]
-- 분류 줄은 환경설정의 '시스템 관리'(ST_SYSTEM)와 같은 모양이다: 주소는 있고, 권한 행은 두지 않는다(자식 화면이 보이면 분류도 보인다).
-- 기초정보 화면 키는 주소의 마지막 칸('settings')이라 화면 연결은 바뀌지 않는다. menu_id 도 그대로라 권한 행(tb_menu_permission · tb_role_menu_permission)도 그대로 쓴다.

BEGIN;

-- 1) 분류 '기준정보' 를 공통관리 맨 앞에 둔다
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, m.module_id, NULL, 'standard', '기준정보', '/cm/standard', NULL, 1, 'Y', NULL
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'CM'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 기초정보를 그 아래로 옮긴다(주소도 분류 아래로: 환경설정의 /settings/system/... 과 같은 규칙)
UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = '/cm/standard/settings',
    sort_order = 10,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'standard'
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.menu_code = 'settings'
  AND c.module_id = p.module_id;

COMMIT;
