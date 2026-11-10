-- 20261106_002_qm_haccp_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 품질관리(/qm)에 중분류 'HACCP' 와 화면 'HACCP(선행)' 을 넣는다
--       (2026-11-06 요청 "선행화면만 먼저 옮겨주는데 결재는 아직 확정된게 없어서", 사용자 결정: 새 중분류 HACCP, 화면 모양만)
--   1) 중분류(권한 행 없음, 품질검사 · 라벨관리 · 온도관리와 같은 모양)
--        QM_HACCP HACCP /qm/haccp 순서 4(맨 뒤. 다른 중분류 순서는 바꾸지 않는다)
--   2) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 HC + Prerequisite + View
--        HCPrerequisiteView HACCP(선행) /qm/haccp/HCPrerequisiteView 순서 10
--   3) HACCP(선행) 권한은 라벨등록(메뉴 권한 · 역할 권한)을 그대로 복사한다(20261106_001 과 같은 방식)
-- 다시 돌려도 결과가 같다.

BEGIN;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, 'QM_HACCP', 'HACCP', '/qm/haccp', NULL, 4, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'QM'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, p.menu_id, 'HCPrerequisiteView', 'HACCP(선행)', p.menu_url || '/HCPrerequisiteView', NULL, 10, 'Y',
       '정해진 질문에 골라 답하는 선행요건 점검표예요. 양식을 등록하고, 점검할 때 그것을 보고 체크해요'
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'QM'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'QM_HACCP'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- HACCP(선행) 권한 = 라벨등록 권한
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT s.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'LBLabelRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'HCPrerequisiteView'
JOIN tb_menu_permission mp ON mp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_menu_permission x WHERE x.menu_id = s.menu_id AND x.permission_id = mp.permission_id);

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, s.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'LBLabelRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'HCPrerequisiteView'
JOIN tb_role_menu_permission rp ON rp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_role_menu_permission x WHERE x.role_id = rp.role_id AND x.menu_id = s.menu_id AND x.permission_id = rp.permission_id);

COMMIT;
