package egovframework.let.co.master.commoncode.service;

import java.util.List;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSearchCondition;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;

public interface CommonCodeGroupService {

    List<CommonCodeGroupVO> listGroups(Long tenantId) throws Exception;

    List<CommonCodeGroupVO> listGroups(Long tenantId, CommonCodeGroupSearchCondition condition) throws Exception;

    CommonCodeGroupVO createGroup(Long tenantId, CommonCodeGroupSaveRequestVO payload) throws Exception;

    CommonCodeGroupVO updateGroup(Long tenantId, Long groupId, CommonCodeGroupSaveRequestVO payload) throws Exception;

    void deleteGroup(Long tenantId, Long groupId) throws Exception;
}
