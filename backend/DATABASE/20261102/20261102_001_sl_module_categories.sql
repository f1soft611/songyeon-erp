-- 20261102_001_sl_module_categories.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 판매관리(/sl)에 물류관리처럼 중분류를 두어 화면을 그 아래로 옮긴다
--       (2026-11-02 요청 "판매관리도 중분류 만들어야하는데", 사용자 결정: 판매처리 / 판매조회 · 폴더 · API · 화면ID 까지 맞춤)
--   1) 모듈은 그대로(SL /sl)
--   2) 중분류(권한 행 없음, 영업관리 · 생산관리 · 물류관리 중분류와 같은 모양)
--        SL_ENTRY   판매처리 /sl/entry    순서 1
--        SL_INQUIRY 판매조회 /sl/inquiry  순서 2
--   3) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 + 화면 뜻(영어) + View
--        판매처리 EN: sales-register → ENSalesRegisterView(10)
--        판매조회 IN: sales-status → INSalesStatusView(10), sales-total → INSalesTotalView(20)
--   - 메뉴 번호 · 이름 · 권한 행(tb_menu_permission · tb_role_menu_permission)은 그대로다.
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 화면ID 를 먼저 바꾼다(중분류 코드와 겹치지 않게)
UPDATE tb_menu m
SET menu_code = v.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('sales-register', 'ENSalesRegisterView'),
             ('sales-status',   'INSalesStatusView'),
             ('sales-total',    'INSalesTotalView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.module_id = (SELECT md.module_id FROM tb_module md WHERE md.tenant_id = t.tenant_id AND md.module_code = 'SL')
  AND m.menu_code = v.old_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.new_code);

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, v.code, v.name, v.url, NULL, v.sort_order, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'SL'
CROSS JOIN (VALUES ('SL_ENTRY',   '판매처리', '/sl/entry',   1),
                   ('SL_INQUIRY', '판매조회', '/sl/inquiry', 2)) AS v(code, name, url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = p.menu_url || '/' || c.menu_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('ENSalesRegisterView', 'SL_ENTRY',   10),
             ('INSalesStatusView',   'SL_INQUIRY', 10),
             ('INSalesTotalView',    'SL_INQUIRY', 20)) AS v(code, parent_code, sort_order),
     tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND c.menu_code = v.code
  AND p.menu_code = v.parent_code
  AND (c.parent_menu_id IS DISTINCT FROM p.menu_id OR c.menu_url <> p.menu_url || '/' || c.menu_code OR c.sort_order <> v.sort_order);

COMMIT;
