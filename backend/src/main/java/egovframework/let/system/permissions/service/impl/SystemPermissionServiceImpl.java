package egovframework.let.system.permissions.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.system.permissions.domain.model.SystemPermissionVO;
import egovframework.let.system.permissions.domain.repository.SystemPermissionDAO;
import egovframework.let.system.permissions.service.SystemPermissionService;

/**
 * 권한 마스터 조회를 위한 서비스 구현 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Service("systemPermissionService")
public class SystemPermissionServiceImpl extends EgovAbstractServiceImpl implements SystemPermissionService {

    private final SystemPermissionDAO systemPermissionDAO;

    public SystemPermissionServiceImpl(SystemPermissionDAO systemPermissionDAO) {
        this.systemPermissionDAO = systemPermissionDAO;
    }

    @Override
    public List<SystemPermissionVO> listActivePermissions() throws Exception {
        return systemPermissionDAO.selectActivePermissionList();
    }
}