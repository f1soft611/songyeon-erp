package egovframework.let.system.modules.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.modules.domain.model.SystemModuleSearchConditionVO;
import egovframework.let.system.modules.domain.model.SystemModuleVO;

/**
 * 모듈 관리를 위한 데이터 접근 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Repository("systemModuleDAO")
public class SystemModuleDAO extends EgovAbstractMapper {

    /**
     * 모듈 목록을 조회한다.
     */
    public List<SystemModuleVO> selectModuleList(SystemModuleSearchConditionVO condition) throws Exception {
        return selectList("SystemModuleDAO.selectModuleList", condition);
    }

    /**
     * 모듈 단건을 조회한다.
     */
    public SystemModuleVO selectModuleById(Map<String, Object> params) throws Exception {
        return selectOne("SystemModuleDAO.selectModuleById", params);
    }

    /**
     * 같은 테넌트 내 모듈 코드 존재 여부를 조회한다.
     */
    public Long selectModuleIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("SystemModuleDAO.selectModuleIdByCode", params);
    }

    /**
     * 모듈을 등록한다.
     */
    public Long insertModule(Map<String, Object> payload) throws Exception {
        return selectOne("SystemModuleDAO.insertModule", payload);
    }

    /**
     * 모듈을 수정한다.
     */
    public void updateModule(Map<String, Object> payload) throws Exception {
        update("SystemModuleDAO.updateModule", payload);
    }

    /**
     * 모듈을 삭제한다.
     */
    public void deleteModule(Map<String, Object> params) throws Exception {
        delete("SystemModuleDAO.deleteModule", params);
    }

    /**
     * 모듈에 속한 메뉴 개수를 조회한다.
     */
    public int countMenusByModuleId(Map<String, Object> params) throws Exception {
        Integer count = selectOne("SystemModuleDAO.countMenusByModuleId", params);
        return count == null ? 0 : count;
    }
}
