package egovframework.let.co.master.commoncode.service;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchSaveResultVO;

public interface CommonCodeBatchService {

    CommonCodeBatchSaveResultVO saveBatch(Long tenantId, CommonCodeBatchSaveRequestVO payload) throws Exception;
}
