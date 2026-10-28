-- 20260831_002_seed_admin_tenant.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 초기 테넌트/관리자 계정 시드 데이터 삽입
-- 비밀번호 해시: EgovFileScrty.encryptPassword("f1soft@611", "admin")
--   = SHA-256(id bytes + password bytes) -> Base64
--   = jGmap+DD6quvR+ES2/kK0kDFUPQtk2XMwGec4S15k20=

INSERT INTO tb_tenant (
  tenant_code, tenant_nm, admin_email, admin_name,
  business_registration_number, onboarding_status, use_at
) VALUES (
  'T1358606250', '에프원소프트', 'admin@f1soft.co.kr', '관리자',
  '1358606250', 'COMPLETED', 'Y'
)
ON CONFLICT (tenant_code) DO NOTHING;

INSERT INTO tb_role (tenant_id, role_code, role_nm, role_dc, is_system_role, use_at)
SELECT tenant_id, 'PLATFORM_ADMIN', '플랫폼 관리자', '플랫폼 전체 관리 권한', 'Y', 'Y'
FROM tb_tenant WHERE tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, role_code) DO NOTHING;

INSERT INTO tb_login_account (tenant_id, login_code, password_hash, use_at)
SELECT tenant_id, 'admin', 'jGmap+DD6quvR+ES2/kK0kDFUPQtk2XMwGec4S15k20=', 'Y'
FROM tb_tenant WHERE tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, login_code) DO NOTHING;

INSERT INTO tb_login_account_role (login_id, role_id)
SELECT la.login_id, r.role_id
FROM tb_login_account la
JOIN tb_tenant t ON t.tenant_id = la.tenant_id
JOIN tb_role r ON r.tenant_id = t.tenant_id AND r.role_code = 'PLATFORM_ADMIN'
WHERE t.tenant_code = 'T1358606250' AND la.login_code = 'admin'
ON CONFLICT (login_id, role_id) DO NOTHING;

INSERT INTO tb_user (tenant_id, login_id, user_nm, email_addr, use_at)
SELECT t.tenant_id, la.login_id, '관리자', 'admin@f1soft.co.kr', 'Y'
FROM tb_login_account la
JOIN tb_tenant t ON t.tenant_id = la.tenant_id
WHERE t.tenant_code = 'T1358606250' AND la.login_code = 'admin'
ON CONFLICT (tenant_id, email_addr) DO NOTHING;
