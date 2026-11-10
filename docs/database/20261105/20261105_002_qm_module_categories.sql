-- 20261105_002_qm_module_categories.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 품질관리(/qm)에 중분류를 두고 라벨등록의 탭 두 개(표시사항 요청 · 라벨양식)를 화면으로 나눈다
--       (2026-11-05 요청 "품질관리도 중분류 만들어서 메뉴 나눠주고 표준맞춰줘", 사용자 결정: 탭을 화면으로 나눔)
--   1) 모듈은 그대로(QM /qm)
--   2) 중분류(권한 행 없음, 다른 모듈 중분류와 같은 모양)
--        QM_LABEL       라벨관리 /qm/label        순서 1
--        QM_TEMPERATURE 온도관리 /qm/temperature  순서 2
--   3) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 + 화면 뜻(영어) + View
--        라벨관리 LB: label-register → LBLabelRegisterView(10), 새 화면 LBLabelRequestView 표시사항 요청(20) · LBLabelFormatView 라벨양식(30)
--        온도관리 TM: temp-monitor → TMTempMonitorView(10)
--   4) 새 화면 2개의 권한은 라벨등록(메뉴 권한 · 역할 권한)을 그대로 복사한다. 탭일 때와 같은 사람이 같은 권한으로 본다
--   - 예전 화면 2개의 메뉴 번호 · 이름 · 설명 · 권한 행은 그대로다.
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 화면ID 를 먼저 바꾼다(중분류 코드와 겹치지 않게)
UPDATE tb_menu m
SET menu_code = v.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('label-register', 'LBLabelRegisterView'),
             ('temp-monitor',   'TMTempMonitorView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.module_id = (SELECT md.module_id FROM tb_module md WHERE md.tenant_id = t.tenant_id AND md.module_code = 'QM')
  AND m.menu_code = v.old_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.new_code);

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, v.code, v.name, v.url, NULL, v.sort_order, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'QM'
CROSS JOIN (VALUES ('QM_LABEL',       '라벨관리', '/qm/label',       1),
                   ('QM_TEMPERATURE', '온도관리', '/qm/temperature', 2)) AS v(code, name, url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = p.menu_url || '/' || c.menu_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('LBLabelRegisterView', 'QM_LABEL',       10),
             ('TMTempMonitorView',   'QM_TEMPERATURE', 10)) AS v(code, parent_code, sort_order),
     tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND c.menu_code = v.code
  AND p.menu_code = v.parent_code
  AND (c.parent_menu_id IS DISTINCT FROM p.menu_id OR c.menu_url <> p.menu_url || '/' || c.menu_code OR c.sort_order <> v.sort_order);

-- 새 화면 2개(예전 라벨등록 탭)
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, p.menu_id, v.code, v.name, p.menu_url || '/' || v.code, NULL, v.sort_order, 'Y', v.dc
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'QM'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'QM_LABEL'
CROSS JOIN (VALUES ('LBLabelRequestView', '표시사항 요청', 20, '상품개발에서 넘어온, 아직 제품코드가 없는 표시사항 요청을 미리 적어두고 제품으로 옮겨요'),
                   ('LBLabelFormatView',  '라벨양식',     30, '라벨 인쇄에 쓰는 양식과 항목 · 마크를 관리해요')) AS v(code, name, sort_order, dc)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 새 화면 권한 = 라벨등록 권한
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT s.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'LBLabelRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code IN ('LBLabelRequestView', 'LBLabelFormatView')
JOIN tb_menu_permission mp ON mp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_menu_permission x WHERE x.menu_id = s.menu_id AND x.permission_id = mp.permission_id);

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, s.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'LBLabelRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code IN ('LBLabelRequestView', 'LBLabelFormatView')
JOIN tb_role_menu_permission rp ON rp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_role_menu_permission x WHERE x.role_id = rp.role_id AND x.menu_id = s.menu_id AND x.permission_id = rp.permission_id);

COMMIT;
