package egovframework.let.system.permissions.service;

import java.util.List;

import egovframework.let.system.permissions.domain.model.SystemPermissionVO;

/**
 * 권한 마스터 조회를 위한 서비스 인터페이스 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public interface SystemPermissionService {

    /**
     * 사용 중인 권한 목록을 조회한다.
     *
     * @exception Exception
     */
    List<SystemPermissionVO> listActivePermissions() throws Exception;
}