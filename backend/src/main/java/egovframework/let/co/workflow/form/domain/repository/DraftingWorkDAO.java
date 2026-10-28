package egovframework.let.co.workflow.form.domain.repository;

import java.util.Map;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkUserOptionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSearchConditionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;

@Repository("draftingWorkDAO")
public class DraftingWorkDAO extends EgovAbstractMapper {

    public List<DraftingWorkUserOptionVO> selectUserOptions(Long tenantId) throws Exception {
        return selectList("DraftingWorkDAO.selectUserOptions", tenantId);
    }

    public List<DraftingWorkVO> selectWorkList(DraftingWorkSearchConditionVO condition) throws Exception {
        return selectList("DraftingWorkDAO.selectWorkList", condition);
    }

    public DraftingWorkVO selectWorkById(Long tenantId, Long workId) throws Exception {
        DraftingWorkSearchConditionVO condition = new DraftingWorkSearchConditionVO();
        condition.setTenantId(tenantId);
        condition.setWorkId(workId);
        List<DraftingWorkVO> rows = selectWorkList(condition);
        return rows == null || rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> selectTemplate(Long tenantId, Long workId) throws Exception {
        Map<String, Object> params = new java.util.HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("workId", workId);
        return selectOne("DraftingWorkDAO.selectTemplate", params);
    }

    public void lockTemplate(Long tenantId, Long workId) throws Exception {
        Map<String, Object> params = new java.util.HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("workId", workId);
        selectOne("DraftingWorkDAO.lockTemplate", params);
    }

    public int updateTemplate(Map<String, Object> params) throws Exception {
        return update("DraftingWorkDAO.updateTemplate", params);
    }

    public Long insertWork(Map<String, Object> params) throws Exception {
        return selectOne("DraftingWorkDAO.insertWork", params);
    }

    public Long selectWorkIdByCode(Long tenantId, String cataTypeCode) throws Exception {
        Map<String, Object> params = new java.util.HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("cataTypeCode", cataTypeCode);
        return selectOne("DraftingWorkDAO.selectWorkIdByCode", params);
    }

    public void insertWorkAuthorityMapping(Map<String, Object> params) throws Exception {
        insert("DraftingWorkDAO.insertWorkAuthorityMapping", params);
    }

    public int updateWork(Map<String, Object> params) throws Exception {
        return update("DraftingWorkDAO.updateWork", params);
    }

    public void deactivateWorkAuthorityMappings(Map<String, Object> params) throws Exception {
        update("DraftingWorkDAO.deactivateWorkAuthorityMappings", params);
    }
}