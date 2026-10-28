package egovframework.let.system.menus.service;

import java.util.List;

import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionEntry;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuRolePermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;

/**
 * 메뉴 관리를 위한 서비스 인터페이스 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public interface SystemMenuService {

    /**
     * 테넌트 기준 메뉴 목록을 조회한다.
     *
     * @param tenantId
     * @param moduleId
     * @exception Exception
     */
    List<SystemMenuVO> listMenus(Long tenantId, Long moduleId) throws Exception;

    /**
     * 선택 권한 기준으로 메뉴 목록과 기본 기능 권한을 조회한다.
     *
     * @param tenantId
     * @param moduleId
     * @param roleId
     * @exception Exception
     */
    List<SystemMenuVO> listMenus(Long tenantId, Long moduleId, Long roleId) throws Exception;

    /**
     * 메뉴를 등록한다.
     *
     * @param tenantId
     * @param payload
     * @exception Exception
     */
    SystemMenuVO createMenu(Long tenantId, SystemMenuSaveRequestVO payload) throws Exception;

    /**
     * 메뉴를 수정한다.
     *
     * @param tenantId
     * @param menuId
     * @param payload
     * @exception Exception
     */
    SystemMenuVO updateMenu(Long tenantId, Long menuId, SystemMenuSaveRequestVO payload) throws Exception;

        /**
         * 리프 메뉴의 버튼 권한을 전체 교체한다.
         *
         * @param tenantId
         * @param menuId
         * @param payload
         * @exception Exception
         */
        SystemMenuVO replaceMenuPermissions(Long tenantId, Long menuId,
            SystemMenuPermissionSaveRequestVO payload) throws Exception;

    /**
     * 메뉴를 삭제한다. 하위 메뉴가 있으면 거부한다.
     *
     * @param tenantId
     * @param menuId
     * @exception Exception
     */
    void deleteMenu(Long tenantId, Long menuId) throws Exception;

    /**
     * 선택 역할에 대한 메뉴 사용 여부 및 기본 기능 권한을 일괄 반영한다.
     *
     * @param tenantId
     * @param roleId
     * @param payload
     * @exception Exception
     */
    void replaceRoleMenuPermissions(Long tenantId, Long roleId,
            List<SystemMenuPermissionEntry> payload) throws Exception;

    default void replaceRoleMenuPermissions(Long tenantId, Long roleId,
            SystemMenuRolePermissionSaveRequestVO payload) throws Exception {
        if (payload == null) {
            replaceRoleMenuPermissions(tenantId, roleId, java.util.Collections.emptyList());
            return;
        }
        replaceRoleMenuPermissions(tenantId, roleId, payload.getMenuPermissions());
    }

    /**
     * 로그인 사용자의 테넌트/역할 기준 모듈-메뉴 트리를 조회한다.
     *
     * @param tenantId
     * @param userId
     * @param roleCode
     * @exception Exception
     */
    default MyMenuResponseVO getMyMenuTree(Long tenantId, String userId, String roleCode) throws Exception {
        return getMyMenuTree(tenantId, userId, null, roleCode);
    }

    /**
     * 로그인 사용자의 테넌트/역할 기준 모듈-메뉴 트리를 조회한다.
     *
     * @param tenantId
     * @param userId
     * @param roleId
     * @param roleCode
     * @exception Exception
     */
    MyMenuResponseVO getMyMenuTree(Long tenantId, String userId, Long roleId, String roleCode) throws Exception;
}
