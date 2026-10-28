package egovframework.let.system.roles.service;

import java.util.List;

import egovframework.let.system.roles.domain.model.SystemRoleSaveRequestVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserAssignRequestVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserMapListVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserVO;
import egovframework.let.system.roles.domain.model.SystemRoleVO;

/**
 * 역할 관리를 위한 서비스 인터페이스 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public interface SystemRoleService {

    /**
     * 테넌트 기준 역할 목록을 조회한다.
     *
     * @param tenantId
     * @exception Exception
     */
    List<SystemRoleVO> listRoles(Long tenantId) throws Exception;

    /**
     * 역할을 등록한다.
     *
     * @param tenantId
     * @param payload
     * @exception Exception
     */
    SystemRoleVO createRole(Long tenantId, SystemRoleSaveRequestVO payload) throws Exception;

    /**
     * 역할을 수정한다. PLATFORM_ADMIN 역할은 비활성화할 수 없다.
     *
     * @param tenantId
     * @param roleId
     * @param payload
     * @exception Exception
     */
    SystemRoleVO updateRole(Long tenantId, Long roleId, SystemRoleSaveRequestVO payload) throws Exception;

    /**
     * 특정 역할에 대해 할당/미할당 사용자 목록을 조회한다.
     */
    SystemRoleUserMapListVO listRoleUsers(Long tenantId, Long roleId) throws Exception;

    /**
     * 역할에 사용자를 연결한다.
     */
    SystemRoleUserVO assignUserToRole(Long tenantId, Long roleId, SystemRoleUserAssignRequestVO payload)
            throws Exception;

    /**
     * 역할에서 사용자를 연결 해제한다.
     */
    boolean removeUserFromRole(Long tenantId, Long roleId, Long loginId) throws Exception;
}
