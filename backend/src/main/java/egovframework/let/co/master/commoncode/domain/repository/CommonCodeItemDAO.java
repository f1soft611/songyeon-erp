package egovframework.let.co.master.commoncode.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;

@Repository("commonCodeItemDAO")
public class CommonCodeItemDAO extends EgovAbstractMapper {

    public List<CommonCodeItemVO> selectItemList(Map<String, Object> params) throws Exception {
        return selectList("CommonCodeItemDAO.selectItemList", params);
    }

    public List<CommonCodeItemVO> selectParentItemList(Map<String, Object> params) throws Exception {
        return selectList("CommonCodeItemDAO.selectParentItemList", params);
    }

    public CommonCodeItemVO selectItemById(Map<String, Object> params) throws Exception {
        return selectOne("CommonCodeItemDAO.selectItemById", params);
    }

    public Long selectItemIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("CommonCodeItemDAO.selectItemIdByCode", params);
    }

    public Long insertItem(Map<String, Object> params) throws Exception {
        return selectOne("CommonCodeItemDAO.insertItem", params);
    }

    public void updateItem(Map<String, Object> params) throws Exception {
        update("CommonCodeItemDAO.updateItem", params);
    }

    public void deleteItem(Map<String, Object> params) throws Exception {
        delete("CommonCodeItemDAO.deleteItem", params);
    }

    public int countChildItems(Map<String, Object> params) throws Exception {
        Integer count = selectOne("CommonCodeItemDAO.countChildItems", params);
        return count == null ? 0 : count;
    }
}
