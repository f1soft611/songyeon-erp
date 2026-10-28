package egovframework.com.common.service;

import java.util.List;
import java.util.Map;

import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonCommentSearchVO;
import egovframework.let.common.dto.ListResult;

public interface CommonCommentService {
    List<CommonCommentVO> listComments(Long tenantId, String ownerType, Long ownerId) throws Exception;
    Map<Long, List<CommonCommentVO>> listCommentsByOwnerIds(Long tenantId, String ownerType, List<Long> ownerIds, Integer limit) throws Exception;
    Map<Long, CommonCommentPageVO> listCommentPagesByOwnerIds(Long tenantId, String ownerType, List<Long> ownerIds, Integer limit) throws Exception;

    /**
     * Returns the newest root comments, including their active descendants.
     * The default and explicit legacy value {@code limit=3} means three roots,
     * not three flattened rows; callers may request 1 through 100 roots.
     */
    CommonCommentPageVO listComments(Long tenantId, String ownerType, Long ownerId, Integer limit, Long beforeCommentId) throws Exception;
    ListResult<CommonCommentVO> listComments(CommonCommentSearchVO search) throws Exception;
    long countComments(Long tenantId, String ownerType, Long ownerId) throws Exception;
    Map<Long, Long> countCommentsByOwnerIds(Long tenantId, String ownerType, List<Long> ownerIds) throws Exception;
    CommonCommentVO createComment(Long tenantId, String ownerType, Long ownerId, String content, String writerId, String writerName, Long parentCommentId) throws Exception;
    CommonCommentVO updateComment(Long tenantId, Long commentId, String content, String actorId) throws Exception;
    CommonCommentVO updateComment(Long tenantId, Long commentId, String content, String actorId, String actorName) throws Exception;
    void deleteComment(Long tenantId, Long commentId, String actorId) throws Exception;
    void deleteComment(Long tenantId, Long commentId, String actorId, String actorName) throws Exception;
}
