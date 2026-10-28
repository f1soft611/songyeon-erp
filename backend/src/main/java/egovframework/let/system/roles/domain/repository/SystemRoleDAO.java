package egovframework.let.system.roles.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.roles.domain.model.SystemRoleSearchConditionVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserVO;
import egovframework.let.system.roles.domain.model.SystemRoleVO;

/**
 * 역할 관리를 위한 데이터 접근 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Repository("systemRoleDAO")
public class SystemRoleDAO extends EgovAbstractMapper {

    /**
     * 역할 목록을 조회한다.
     */
    public List<SystemRoleVO> selectRoleList(SystemRoleSearchConditionVO condition) throws Exception {
        return selectList("SystemRoleDAO.selectRoleList", condition);
    }

    /**
     * 역할 단건을 조회한다.
     */
    public SystemRoleVO selectRoleById(Map<String, Object> params) throws Exception {
        return selectOne("SystemRoleDAO.selectRoleById", params);
    }

    /**
     * 같은 테넌트 내 역할 코드 존재 여부를 조회한다.
     */
    public Long selectRoleIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("SystemRoleDAO.selectRoleIdByCode", params);
    }

    /**
     * 역할을 등록한다.
     */
    public Long insertRole(Map<String, Object> payload) throws Exception {
        return selectOne("SystemRoleDAO.insertRole", payload);
    }

    /**
     * 역할을 수정한다.
     */
    public void updateRole(Map<String, Object> payload) throws Exception {
        update("SystemRoleDAO.updateRole", payload);
    }

    /**
     * 역할에 연결된 사용자 목록을 조회한다.
     */
    public List<SystemRoleUserVO> selectAssignedRoleUsers(Map<String, Object> params) throws Exception {
        return selectList("SystemRoleDAO.selectAssignedRoleUsers", params);
    }

    /**
     * 역할에 연결되지 않은 사용자 목록을 조회한다.
     */
    public List<SystemRoleUserVO> selectUnassignedRoleUsers(Map<String, Object> params) throws Exception {
        return selectList("SystemRoleDAO.selectUnassignedRoleUsers", params);
    }

    /**
     * 역할-사용자 매핑 여부를 조회한다.
     */
    public Long selectRoleUserMappingId(Map<String, Object> params) throws Exception {
        return selectOne("SystemRoleDAO.selectRoleUserMappingId", params);
    }

    /**
     * 사용자 ID로 로그인 ID를 조회한다.
     */
    public Long selectLoginIdByUserId(Map<String, Object> params) throws Exception {
        return selectOne("SystemRoleDAO.selectLoginIdByUserId", params);
    }

    /**
     * 역할 사용자 매핑을 추가한다.
     */
    public void insertRoleUserMapping(Map<String, Object> params) throws Exception {
        insert("SystemRoleDAO.insertRoleUserMapping", params);
    }

    /**
     * 특정 사용자와 역할의 매핑을 삭제한다.
     */
    public int deleteRoleUserMapping(Map<String, Object> params) throws Exception {
        return delete("SystemRoleDAO.deleteRoleUserMapping", params);
    }

    /**
     * 특정 사용자 레코드를 조회한다.
     */
    public SystemRoleUserVO selectAssignedUserByLoginId(Map<String, Object> params) throws Exception {
        return selectOne("SystemRoleDAO.selectAssignedUserByLoginId", params);
    }
}
