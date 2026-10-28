-- 20261021_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261021_001 되돌리기 — SONGYEON 계정 · 역할 연결을 지우고, ADMIN 역할 메뉴 권한을 적용 전으로 돌린다.
-- 주의
--   - 코드(로그인 · 권한 판정 · 권한관리 · 인사관리 계정 · 내 정보 비밀번호)도 함께 되돌려야 한다.
--   - 적용 전 SONGYEON 계정 · 역할 연결은 0줄이었다. 적용 뒤 인사관리 · 권한관리에서 만든 계정 · 연결도 함께 지워진다(연결은 FK CASCADE).
--   - 비밀번호는 employees.password_hash 에도 같은 값으로 남아 있어 옛 코드로 그대로 로그인된다.

BEGIN;

DO $$
BEGIN
    IF to_regclass('bak_20261021_001_admin_role_menu_permission') IS NULL THEN
        RAISE EXCEPTION '백업 표 bak_20261021_001_admin_role_menu_permission 가 없습니다';
    END IF;
END $$;

DELETE FROM tb_role_menu_permission p
USING tb_role r, tb_tenant t
WHERE r.role_id = p.role_id
  AND t.tenant_id = r.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND r.role_code = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM bak_20261021_001_admin_role_menu_permission b
      WHERE b.role_id = p.role_id AND b.menu_id = p.menu_id AND b.permission_id = p.permission_id
  );

DROP TABLE bak_20261021_001_admin_role_menu_permission;

DELETE FROM tb_login_account la
USING tb_tenant t
WHERE t.tenant_id = la.tenant_id
  AND t.tenant_code = 'SONGYEON';

COMMIT;
