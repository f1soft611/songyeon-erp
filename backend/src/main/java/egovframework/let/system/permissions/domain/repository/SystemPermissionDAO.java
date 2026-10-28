package egovframework.let.system.permissions.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.permissions.domain.model.SystemPermissionVO;

/**
 * 권한 마스터 데이터 접근 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Repository("systemPermissionDAO")
public class SystemPermissionDAO extends EgovAbstractMapper {

    /**
     * 사용 중인 권한 목록을 조회한다.
     */
    public List<SystemPermissionVO> selectActivePermissionList() throws Exception {
        return selectList("SystemPermissionDAO.selectActivePermissionList");
    }
}