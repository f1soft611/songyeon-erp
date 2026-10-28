package egovframework.com.common.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.com.common.domain.model.CommonCommentVO;

@Repository("commonCommentDAO")
public class CommonCommentDAO extends EgovAbstractMapper {

    public List<CommonCommentVO> selectCommonCommentList(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectCommonCommentList", params);
    }

    public List<CommonCommentVO> selectCommonCommentPageByOwnerIds(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectCommonCommentPageByOwnerIds", params);
    }

    public List<Map<String, Object>> selectCommonCommentCountsByOwnerIds(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectCommonCommentCountsByOwnerIds", params);
    }

    public List<CommonCommentVO> selectApprovalSystemEvents(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectApprovalSystemEvents", params);
    }

    public List<CommonCommentVO> selectApprovalSystemEventsByOwnerIds(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectApprovalSystemEventsByOwnerIds", params);
    }

    public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectCommonCommentPage", params);
    }

    public List<CommonCommentVO> selectApprovalUserCommentPage(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectApprovalUserCommentPage", params);
    }

    public Long countApprovalUserComments(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonCommentDAO.countApprovalUserComments", params);
    }

    public List<CommonCommentVO> selectApprovalUserCommentPagesByOwnerIds(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectApprovalUserCommentPagesByOwnerIds", params);
    }

    public List<Map<String, Object>> selectApprovalUserCommentCountsByOwnerIds(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectApprovalUserCommentCountsByOwnerIds", params);
    }

    public List<CommonCommentVO> selectApprovalCommentStreamPagesByOwnerIds(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectApprovalCommentStreamPagesByOwnerIds", params);
    }

    public List<CommonCommentVO> selectApprovalUserCommentThreadsByRootIds(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectApprovalUserCommentThreadsByRootIds", params);
    }

    public List<Map<String, Object>> selectApprovalCommentStreamCountsByOwnerIds(Map<String, Object> params)
            throws Exception {
        return selectList("CommonCommentDAO.selectApprovalCommentStreamCountsByOwnerIds", params);
    }

    public CommonCommentVO selectApprovalCommentStreamCursor(Map<String, Object> params) throws Exception {
        return (CommonCommentVO) selectOne("CommonCommentDAO.selectApprovalCommentStreamCursor", params);
    }

    public Long countCommonComments(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonCommentDAO.countCommonComments", params);
    }

    public CommonCommentVO selectCommonCommentById(Map<String, Object> params) throws Exception {
        return (CommonCommentVO) selectOne("CommonCommentDAO.selectCommonCommentById", params);
    }

    public CommonCommentVO selectApprovalUserCommentById(Map<String, Object> params) throws Exception {
        return (CommonCommentVO) selectOne("CommonCommentDAO.selectApprovalUserCommentById", params);
    }

    public Long insertCommonComment(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonCommentDAO.insertCommonComment", params);
    }

    public Long insertSystemComment(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonCommentDAO.insertSystemComment", params);
    }

    public int updateCommonComment(Map<String, Object> params) throws Exception {
        return update("CommonCommentDAO.updateCommonComment", params);
    }

    public int updateApprovalUserComment(Map<String, Object> params) throws Exception {
        return update("CommonCommentDAO.updateApprovalUserComment", params);
    }

    public int softDeleteCommonComment(Map<String, Object> params) throws Exception {
        return update("CommonCommentDAO.softDeleteCommonComment", params);
    }

    public int softDeleteApprovalUserComment(Map<String, Object> params) throws Exception {
        return update("CommonCommentDAO.softDeleteApprovalUserComment", params);
    }
}
