-- 20261021_001_songyeon_login_account_role.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 송연 직원을 S_ERP 계정 표로 이어 권한관리(역할 · 메뉴 권한)를 S_ERP 와 같이 쓰게 한다(2026-10-21 요청).
--   - 표 구조는 바꾸지 않는다(데이터만).
--   - 계정 있는 직원(employees.username · password_hash 가 있음)마다 tb_login_account 한 줄: login_code = 사번(employees.id), 비밀번호 해시 그대로.
--   - 역할 연결: employees.is_admin = 1 → ADMIN(시스템 관리자), 그 밖 → DEFAULT_USER(일반 사용자).
--   - ADMIN 에 SONGYEON 메뉴의 권한 정의(tb_menu_permission)를 모두 준다. 그래야 지금과 같은 메뉴 · 단추가 보인다.
--   - 적용 전 ADMIN 의 역할 메뉴 권한은 bak_20261021_001_admin_role_menu_permission 에 남긴다(롤백용).
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
DECLARE
    v_tenant_id BIGINT;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM tb_tenant WHERE tenant_code = 'SONGYEON';
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'SONGYEON 테넌트가 없습니다';
    END IF;
    IF (SELECT count(*) FROM tb_role WHERE tenant_id = v_tenant_id AND role_code IN ('ADMIN', 'DEFAULT_USER')) <> 2 THEN
        RAISE EXCEPTION 'SONGYEON 역할 ADMIN · DEFAULT_USER 가 없습니다';
    END IF;
END $$;

-- 1) 롤백용: 적용 전 ADMIN 역할 메뉴 권한(처음 한 번만 만든다)
CREATE TABLE IF NOT EXISTS bak_20261021_001_admin_role_menu_permission AS
SELECT p.role_id, p.menu_id, p.permission_id
FROM tb_role_menu_permission p
JOIN tb_role r ON r.role_id = p.role_id
JOIN tb_tenant t ON t.tenant_id = r.tenant_id
WHERE t.tenant_code = 'SONGYEON'
  AND r.role_code = 'ADMIN';

-- 2) 계정: 직원마다 한 줄(login_code = 사번)
INSERT INTO tb_login_account (tenant_id, login_code, password_hash, use_at)
SELECT t.tenant_id, e.id, e.password_hash, 'Y'
FROM employees e
JOIN tb_tenant t ON t.tenant_code = 'SONGYEON'
WHERE e.username IS NOT NULL
  AND COALESCE(e.password_hash, '') <> ''
ON CONFLICT (tenant_id, login_code) DO NOTHING;

-- 3) 역할 연결: 관리자 표시(is_admin = 1) → ADMIN, 그 밖 → DEFAULT_USER
INSERT INTO tb_login_account_role (login_id, role_id)
SELECT la.login_id, r.role_id
FROM tb_login_account la
JOIN tb_tenant t ON t.tenant_id = la.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN employees e ON e.id = la.login_code
JOIN tb_role r
  ON r.tenant_id = la.tenant_id
 AND r.role_code = CASE WHEN COALESCE(e.is_admin, 0) = 1 THEN 'ADMIN' ELSE 'DEFAULT_USER' END
ON CONFLICT (login_id, role_id) DO NOTHING;

-- 4) ADMIN 메뉴 권한: SONGYEON 메뉴의 권한 정의 전부
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mp.menu_id, mp.permission_id
FROM tb_role r
JOIN tb_tenant t ON t.tenant_id = r.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN tb_menu m ON m.tenant_id = r.tenant_id
JOIN tb_menu_permission mp ON mp.menu_id = m.menu_id
WHERE r.role_code = 'ADMIN'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

COMMIT;
