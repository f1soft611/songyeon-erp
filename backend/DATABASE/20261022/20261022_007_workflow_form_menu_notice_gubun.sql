-- 20261022_007_workflow_form_menu_notice_gubun.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 그룹웨어 화면 이관 준비 데이터(계획 · 사양서 20261022_008 4절). S_ERP DB 값을 읽어 맞췄다.
--   1) 기안양식관리 메뉴: S_ERP 공통 모듈의 전자결재 관리(CO_WORKFLOW) > 기안양식관리(CO_WF_FORM, /co/workflow/form)를
--      송연 기준정보(CO) 모듈 아래에 넣는다. 맨 위 순서는 기존 메뉴(기초정보 1 · 스케줄관리 2) 뒤 3.
--      역할 권한: 플랫폼 관리자 READ · CREATE · UPDATE(S_ERP 와 같음), 시스템 관리자(ADMIN)는 송연 규칙대로 모두.
--      기능 권한(tb_menu_permission)은 S_ERP 처럼 두지 않는다.
--   2) 공지사항 구분(NOTICE_GUBUN) ALL(전체) · IMPORTANT(중요 공지)를 S_ERP 처럼 사용안함으로.
--      새 공지 화면은 사용 중인 구분만 분류로 보여 준다(전체 · 중요 공지는 화면이 따로 다룬다).
-- 다시 돌려도 결과가 같다.

BEGIN;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT mo.tenant_id, mo.module_id, NULL, 'CO_WORKFLOW', '전자결재 관리', '/co/workflow', NULL, 3, 'Y', NULL
FROM tb_module mo
JOIN tb_tenant t ON t.tenant_id = mo.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE mo.module_code = 'CO'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT p.tenant_id, p.module_id, p.menu_id, 'CO_WF_FORM', '기안양식관리', '/co/workflow/form', NULL, 10, 'Y', '전자결재 기안 양식을 등록하고 관리합니다.'
FROM tb_menu p
JOIN tb_tenant t ON t.tenant_id = p.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE p.menu_code = 'CO_WORKFLOW'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, m.menu_id, pm.permission_id
FROM tb_menu m
JOIN tb_tenant t ON t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN (VALUES
  ('PLATFORM_ADMIN', 'READ'), ('PLATFORM_ADMIN', 'CREATE'), ('PLATFORM_ADMIN', 'UPDATE'),
  ('ADMIN', 'READ'), ('ADMIN', 'CREATE'), ('ADMIN', 'UPDATE'), ('ADMIN', 'DELETE'), ('ADMIN', 'EXCEL')
) AS x(role_code, permission_code) ON TRUE
JOIN tb_role r ON r.tenant_id = m.tenant_id AND r.role_code = x.role_code
JOIN tb_permission pm ON pm.permission_code = x.permission_code
WHERE m.menu_code = 'CO_WF_FORM'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

UPDATE tb_common_code_item i
SET use_at = 'N', updated_at = CURRENT_TIMESTAMP
FROM tb_common_code_group g
JOIN tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE i.group_id = g.common_code_group_id
  AND g.group_code = 'NOTICE_GUBUN'
  AND i.item_code IN ('ALL', 'IMPORTANT')
  AND i.use_at <> 'N';

COMMIT;
