package egovframework.com.common.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.com.common.domain.model.CommonFileVO;

@Repository("commonFileDAO")
public class CommonFileDAO extends EgovAbstractMapper {

    public List<CommonFileVO> selectCommonFileList(Map<String, Object> params) throws Exception {
        return selectList("CommonFileDAO.selectCommonFileList", params);
    }

    public List<CommonFileVO> selectCommonFileListByOwnerIds(Map<String, Object> params) throws Exception {
        return selectList("CommonFileDAO.selectCommonFileListByOwnerIds", params);
    }

    public CommonFileVO selectCommonFileById(Map<String, Object> params) throws Exception {
        return (CommonFileVO) selectOne("CommonFileDAO.selectCommonFileById", params);
    }

    public CommonFileVO selectCommonFileByIdExcludingApproval(Map<String, Object> params) throws Exception {
        return (CommonFileVO) selectOne("CommonFileDAO.selectCommonFileByIdExcludingApproval", params);
    }

    public CommonFileVO selectCommonFileByIdAndOwner(Map<String, Object> params) throws Exception {
        return (CommonFileVO) selectOne("CommonFileDAO.selectCommonFileByIdAndOwner", params);
    }

    public Long insertCommonFile(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonFileDAO.insertCommonFile", params);
    }

    public void updateCommonFile(Map<String, Object> params) throws Exception {
        update("CommonFileDAO.updateCommonFile", params);
    }

    public void softDeleteCommonFileExcludingApproval(Map<String, Object> params) throws Exception {
        update("CommonFileDAO.softDeleteCommonFileExcludingApproval", params);
    }

    public void softDeleteCommonFileByOwner(Map<String, Object> params) throws Exception {
        update("CommonFileDAO.softDeleteCommonFileByOwner", params);
    }
}
