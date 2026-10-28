package egovframework.let.co.master.commoncode.service;

import java.util.List;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;

public interface CommonCodeItemService {

    List<CommonCodeItemVO> listItems(Long tenantId, Long groupId) throws Exception;

    List<CommonCodeItemVO> listParentItems(Long tenantId, Long groupId) throws Exception;

    CommonCodeItemVO createItem(Long tenantId, Long groupId, CommonCodeItemSaveRequestVO payload) throws Exception;

    CommonCodeItemVO updateItem(Long tenantId, Long groupId, Long itemId, CommonCodeItemSaveRequestVO payload) throws Exception;

    void deleteItem(Long tenantId, Long groupId, Long itemId) throws Exception;
}
