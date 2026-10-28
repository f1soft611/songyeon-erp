package egovframework.com.cmm.util;

import egovframework.com.cmm.LoginVO;

/**
 * 역할코드 기준 테넌트 관리자 여부를 판별하는 접근제어 헬퍼 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public class EgovAccessControlHelper {

    private static final String PLATFORM_ADMIN = "PLATFORM_ADMIN";
    private static final String TENANT_ADMIN = "TENANT_ADMIN";
    private static final String LEGACY_ADMIN = "ADMIN";

    private EgovAccessControlHelper() {
    }

    /**
     * 로그인 사용자가 테넌트(또는 플랫폼) 관리자 역할인지 확인한다.
     * legacy ADMIN 또는 any assigned PLATFORM_ADMIN role should also be considered admin access.
     */
    public static boolean isTenantAdmin(LoginVO user) {
        if (user == null) {
            return false;
        }

        // 역할이 없는 계정은 관리자가 아니다(2026-10-21 송연도 S_ERP 와 같이 역할 · 권한을 쓴다)
        if (user.getRoleCode() == null) {
            return false;
        }

        String roleCode = user.getRoleCode().trim();
        return PLATFORM_ADMIN.equals(roleCode)
            || TENANT_ADMIN.equals(roleCode)
            || LEGACY_ADMIN.equals(roleCode);
    }
}
