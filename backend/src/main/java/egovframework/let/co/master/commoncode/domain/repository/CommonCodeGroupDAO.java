package egovframework.let.co.master.commoncode.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;

@Repository("commonCodeGroupDAO")
public class CommonCodeGroupDAO extends EgovAbstractMapper {

    public List<CommonCodeGroupVO> selectGroupList(Long tenantId) throws Exception {
        Map<String, Object> params = new java.util.HashMap<>();
        params.put("tenantId", tenantId);
        return selectGroupList(params);
    }

    public List<CommonCodeGroupVO> selectGroupList(Map<String, Object> params) throws Exception {
        return selectList("CommonCodeGroupDAO.selectGroupList", params);
    }

    public CommonCodeGroupVO selectGroupById(Map<String, Object> params) throws Exception {
        return selectOne("CommonCodeGroupDAO.selectGroupById", params);
    }

    public Long selectGroupIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("CommonCodeGroupDAO.selectGroupIdByCode", params);
    }

    public Long insertGroup(Map<String, Object> params) throws Exception {
        return selectOne("CommonCodeGroupDAO.insertGroup", params);
    }

    public void updateGroup(Map<String, Object> params) throws Exception {
        update("CommonCodeGroupDAO.updateGroup", params);
    }

    public void deleteGroup(Map<String, Object> params) throws Exception {
        delete("CommonCodeGroupDAO.deleteGroup", params);
    }

    public int countChildGroups(Map<String, Object> params) throws Exception {
        Integer count = selectOne("CommonCodeGroupDAO.countChildGroups", params);
        return count == null ? 0 : count;
    }

    public int countItemsByGroupId(Map<String, Object> params) throws Exception {
        Integer count = selectOne("CommonCodeGroupDAO.countItemsByGroupId", params);
        return count == null ? 0 : count;
    }
}
