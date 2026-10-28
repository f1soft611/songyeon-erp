-- 20261002_001_seed_songyeon_settings_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: S_ERP 환경설정(SETTINGS) 모듈·메뉴·권한·역할을 송연 DB에 동일하게 등록
-- 기준: S_ERP 운영 DB(s-erp_central) 2026-10-02 읽기 전용 조회 결과와 같은 코드·이름·URL·정렬·사용여부·설명
-- 로그인: 계정은 송연 employees 를 그대로 쓴다(tb_login_account 미사용). 역할·권한은 쓰지 않는다(2026-10-02 수정, 아래 역할 행은 권한관리 화면용으로만 남김).
--         tb_module/tb_menu/tb_role 이 tenant_id 를 요구하므로 내부용 테넌트 'SONGYEON' 하나를 둔다.

BEGIN;

-- 1. 내부 테넌트
INSERT INTO tb_tenant (tenant_code, tenant_nm, admin_email, admin_name, onboarding_status, use_at)
VALUES ('SONGYEON', '송연', 'admin@songyeon.local', '관리자', 'COMPLETED', 'Y')
ON CONFLICT (tenant_code) DO NOTHING;

-- 2. 기능 권한 (전역, S_ERP 와 같은 코드·이름·정렬)
INSERT INTO tb_permission (permission_code, permission_nm, sort_order, use_at) VALUES
  ('READ', '조회', 10, 'Y'),
  ('CREATE', '등록', 20, 'Y'),
  ('UPDATE', '수정', 30, 'Y'),
  ('DELETE', '삭제', 40, 'Y'),
  ('EXCEL', '엑셀', 50, 'Y'),
  ('BOARD_VIEW', '조회', 1, 'Y'),
  ('BOARD_WRITE', '등록', 2, 'Y'),
  ('BOARD_DELETE', '삭제', 3, 'Y'),
  ('BOARD_UPLOAD', '파일업로드', 4, 'Y')
ON CONFLICT (permission_code) DO NOTHING;

-- 3. 역할 (S_ERP 와 같은 4개)
INSERT INTO tb_role (tenant_id, role_code, role_nm, role_dc, is_system_role, use_at)
SELECT t.tenant_id, r.role_code, r.role_nm, r.role_dc, r.is_system_role, 'Y'
FROM tb_tenant t
CROSS JOIN (VALUES
  ('PLATFORM_ADMIN', '플랫폼 관리자', '플랫폼 전체 관리 권한', 'Y'),
  ('ADMIN', '시스템 관리자', '시스템 전체 관리 권한', 'N'),
  ('ROLE_INFO_MANAGER', '커뮤니티 관리자', '그룹웨어 하위 정보센터 전체 관리 권한', 'N'),
  ('DEFAULT_USER', '일반 사용자', '일반 사용자 관리 권한', 'N')
) AS r(role_code, role_nm, role_dc, is_system_role)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, role_code) DO NOTHING;

-- 4. 모듈: 환경설정
INSERT INTO tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
SELECT tenant_id, 'SETTINGS', '환경설정', 'Settings', '/settings', 99, 'Y'
FROM tb_tenant WHERE tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, module_code) DO NOTHING;

-- 5. 메뉴: 환경설정 > 시스템 관리
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, m.module_id, NULL, 'ST_SYSTEM', '시스템 관리', '/settings/system', NULL, 1, 'Y', NULL
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 6. 메뉴: 시스템 관리 하위 6개
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, m.module_id, p.menu_id, c.menu_code, c.menu_nm, c.menu_url, NULL, c.sort_order, c.use_at, c.menu_dc
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = 'SETTINGS'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'ST_SYSTEM'
CROSS JOIN (VALUES
  ('ST_MODULE', '모듈관리', '/settings/system/modules', 10, 'Y', '모듈별 업무를 한눈에 확인하고 필요한 프로세스를 빠르게 진행할 수 있습니다.'),
  ('ST_ROLES', '권한관리', '/settings/system/roles', 20, 'Y', '역할별 메뉴 접근 권한과 기능 권한을 설정합니다.'),
  ('ST_MENUS', '메뉴관리', '/settings/system/menus', 30, 'Y', '모듈별 메뉴 구성과 상위/하위 메뉴 관계를 관리합니다.'),
  ('ST_F1_GRID_TEST', 'F1 Grid 테스트', '/settings/system/f1-grid-test', 40, 'N', NULL),
  ('ST_WAREHOUSE', '창고관리', '/settings/system/warehouses', 50, 'Y', '테넌트별 창고 마스터(창고명, 사용 여부)를 관리합니다.'),
  ('ST_CUSTOMER', '고객정보', '/settings/system/customers', 60, 'Y', '고객 기본정보와 사업자정보, 연락처를 관리합니다.')
) AS c(menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 7. 메뉴별 사용 가능 권한: 하위 6개 메뉴 × READ/CREATE/UPDATE/DELETE/EXCEL
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t ON t.tenant_id = mn.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL')
WHERE mn.menu_code IN ('ST_MODULE', 'ST_ROLES', 'ST_MENUS', 'ST_F1_GRID_TEST', 'ST_WAREHOUSE', 'ST_CUSTOMER')
ON CONFLICT (menu_id, permission_id) DO NOTHING;

-- 8. 역할별 메뉴 권한 (S_ERP 와 동일)
--    PLATFORM_ADMIN: 하위 6개 메뉴 × READ/CREATE/UPDATE/EXCEL
--    ADMIN: 권한관리·메뉴관리·F1 Grid 테스트 × EXCEL
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mn.menu_id, pm.permission_id
FROM tb_tenant t
JOIN tb_role r ON r.tenant_id = t.tenant_id
JOIN tb_menu mn ON mn.tenant_id = t.tenant_id
JOIN tb_permission pm ON TRUE
WHERE t.tenant_code = 'SONGYEON'
  AND (
       (r.role_code = 'PLATFORM_ADMIN'
        AND mn.menu_code IN ('ST_MODULE', 'ST_ROLES', 'ST_MENUS', 'ST_F1_GRID_TEST', 'ST_WAREHOUSE', 'ST_CUSTOMER')
        AND pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'EXCEL'))
    OR (r.role_code = 'ADMIN'
        AND mn.menu_code IN ('ST_ROLES', 'ST_MENUS', 'ST_F1_GRID_TEST')
        AND pm.permission_code = 'EXCEL')
  )
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

COMMIT;
