-- 20261106_001_qm_inspection_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 품질관리(/qm)에 중분류 '품질검사' 와 화면 '제품검사' 를 넣는다
--       (2026-11-06 요청 "제품검사 화면 일단 화면만 먼저 옮겨줘", 사용자 결정: 새 중분류 품질검사)
--   1) 중분류(권한 행 없음, 라벨관리 · 온도관리와 같은 모양)
--        QM_INSPECTION 품질검사 /qm/inspection 순서 3
--   2) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 QI + ProductInspection + View
--        QIProductInspectionView 제품검사 /qm/inspection/QIProductInspectionView 순서 10
--   3) 제품검사 권한은 라벨등록(메뉴 권한 · 역할 권한)을 그대로 복사한다(20261105_002 와 같은 방식)
-- 다시 돌려도 결과가 같다.

BEGIN;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, 'QM_INSPECTION', '품질검사', '/qm/inspection', NULL, 3, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'QM'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, p.menu_id, 'QIProductInspectionView', '제품검사', p.menu_url || '/QIProductInspectionView', NULL, 10, 'Y',
       '생산이 끝난 로트의 염도 · BRIX 같은 측정값을 넣어 제품규격성적서로 발행해요'
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'QM'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'QM_INSPECTION'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 제품검사 권한 = 라벨등록 권한
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT s.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'LBLabelRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'QIProductInspectionView'
JOIN tb_menu_permission mp ON mp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_menu_permission x WHERE x.menu_id = s.menu_id AND x.permission_id = mp.permission_id);

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, s.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'LBLabelRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'QIProductInspectionView'
JOIN tb_role_menu_permission rp ON rp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_role_menu_permission x WHERE x.role_id = rp.role_id AND x.menu_id = s.menu_id AND x.permission_id = rp.permission_id);

COMMIT;
