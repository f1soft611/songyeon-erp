-- 20261016_003_rename_cm_standard_to_master.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리 '기준정보' 분류의 코드 · 주소를 S_ERP(/co/master/...)처럼 master 로 바꾼다.
--       분류 standard → master, /cm/standard → /cm/master, 그 아래 화면 주소 /cm/standard/* → /cm/master/*
-- 화면 키(주소 마지막 칸 settings · BSBoxTypeView)와 menu_id · 권한 행은 그대로다.
-- 앞선 작업: 20261016_001 (분류 추가) · 20261016_002 (포장유형 화면)

BEGIN;

-- 1) 아래 화면 주소
UPDATE tb_menu c
SET menu_url = '/cm/master/' || substring(c.menu_url FROM length('/cm/standard/') + 1),
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'standard'
WHERE t.tenant_code = 'SONGYEON'
  AND c.parent_menu_id = p.menu_id
  AND c.menu_url LIKE '/cm/standard/%';

-- 2) 분류 코드 · 주소
UPDATE tb_menu p
SET menu_code = 'master', menu_url = '/cm/master', updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND p.tenant_id = t.tenant_id
  AND p.menu_code = 'standard'
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = 'master');

COMMIT;
