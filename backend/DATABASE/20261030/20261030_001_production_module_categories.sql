-- 20261030_001_production_module_categories.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 생산관리(/pd)에 영업관리처럼 중분류를 두어 화면을 그 아래로 옮긴다
--       (2026-10-30 요청 "생산관리쪽 메뉴도 안에 중분류 있었으면 좋게는데", 사용자 결정: 중분류 3개 · 영업관리처럼 폴더 · API · 화면ID 까지 맞춤)
--   1) 모듈은 그대로(PD /pd. S_ERP 에 생산관리 모듈이 없어 주소를 바꾸지 않는다)
--   2) 중분류(권한 행 없음, 영업관리 · 기준정보 중분류와 같은 모양)
--        PD_PLAN   생산계획 /pd/plan    순서 1
--        PD_RESULT 생산실적 /pd/result  순서 2
--        PD_LABEL  라벨관리 /pd/label   순서 3
--   3) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 + 화면 뜻(영어) + View
--        생산계획 PP: prod-confirm → PPProdConfirmView(10)
--        생산실적 PR: actual → PRProdActualView(10), prod-status → PRProdStatusView(20)
--        라벨관리 LB: label-print → LBLabelPrintView(10)
--   - 메뉴 번호 · 이름 · 권한 행(tb_menu_permission · tb_role_menu_permission)은 그대로다.
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 화면ID 를 먼저 바꾼다(중분류 코드와 겹치지 않게)
UPDATE tb_menu m
SET menu_code = v.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('prod-confirm', 'PPProdConfirmView'),
             ('actual',       'PRProdActualView'),
             ('prod-status',  'PRProdStatusView'),
             ('label-print',  'LBLabelPrintView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.module_id = (SELECT md.module_id FROM tb_module md WHERE md.tenant_id = t.tenant_id AND md.module_code = 'PD')
  AND m.menu_code = v.old_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.new_code);

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, v.code, v.name, v.url, NULL, v.sort_order, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'PD'
CROSS JOIN (VALUES ('PD_PLAN',   '생산계획', '/pd/plan',   1),
                   ('PD_RESULT', '생산실적', '/pd/result', 2),
                   ('PD_LABEL',  '라벨관리', '/pd/label',  3)) AS v(code, name, url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = p.menu_url || '/' || c.menu_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('PPProdConfirmView', 'PD_PLAN',   10),
             ('PRProdActualView',  'PD_RESULT', 10),
             ('PRProdStatusView',  'PD_RESULT', 20),
             ('LBLabelPrintView',  'PD_LABEL',  10)) AS v(code, parent_code, sort_order),
     tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND c.menu_code = v.code
  AND p.menu_code = v.parent_code
  AND (c.parent_menu_id IS DISTINCT FROM p.menu_id OR c.menu_url <> p.menu_url || '/' || c.menu_code OR c.sort_order <> v.sort_order);

COMMIT;
