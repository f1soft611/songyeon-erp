package egovframework.let.groupware.approval.common.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.common.service.DocumentApprovalCommentSupportService;

@Service("documentApprovalCommentSupportService")
public class DocumentApprovalCommentSupportServiceImpl extends EgovAbstractServiceImpl
        implements DocumentApprovalCommentSupportService {

    private static final String OWNER_TYPE = "APPROVAL";
    private static final String COMMENT_FILE_OWNER_TYPE = "APPROVAL_COMMENT";
    private final CommonCommentDAO commonCommentDAO;
    private final CommonFileService commonFileService;
    public DocumentApprovalCommentSupportServiceImpl(CommonCommentDAO commonCommentDAO,
            CommonFileService commonFileService) {
        this.commonCommentDAO = commonCommentDAO;
        this.commonFileService = commonFileService;
    }

    @Override
    public Map<Long, DocumentApprovalCommentPageVO> listApprovalCommentStreamPagesByOwnerIds(
            LoginVO user, List<Long> approvalIds, int limit, Long beforeCommentId) throws Exception {
        if (approvalIds == null || approvalIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, Object> params = approvalCommentParams(user, null, beforeCommentId);
        params.put("ownerIds", approvalIds);
        params.put("limit", limit + 1);
        params.put("beforeCommentId", beforeCommentId);
        List<CommonCommentVO> fetchedRoots =
            commonCommentDAO.selectApprovalCommentStreamPagesByOwnerIds(params);
        if (fetchedRoots == null) {
            throw new IllegalStateException("전자결재 댓글 페이지 조회 결과가 없습니다.");
        }

        Map<Long, List<CommonCommentVO>> rootsByOwnerId = new HashMap<>();
        for (Long approvalId : approvalIds) {
            rootsByOwnerId.put(approvalId, new ArrayList<>());
        }
        for (CommonCommentVO root : fetchedRoots) {
            if (root == null || root.getOwnerId() == null || root.getCommentId() == null) {
                throw new IllegalStateException("전자결재 댓글 페이지 항목이 올바르지 않습니다.");
            }
            List<CommonCommentVO> ownerRoots = rootsByOwnerId.get(root.getOwnerId());
            if (ownerRoots == null ||
                    !("USER".equals(root.getCommentType()) || "SYSTEM".equals(root.getCommentType()))) {
                throw new IllegalStateException("전자결재 댓글 페이지 항목이 올바르지 않습니다.");
            }
            ownerRoots.add(root);
        }

        List<Map<String, Object>> countRows =
            commonCommentDAO.selectApprovalCommentStreamCountsByOwnerIds(params);
        if (countRows == null) {
            throw new IllegalStateException("전자결재 댓글 건수 조회 결과가 없습니다.");
        }
        Map<Long, Long> countsByOwnerId = new HashMap<>();
        for (Map<String, Object> row : countRows) {
            if (row == null || !(row.get("ownerId") instanceof Number)
                    || !(row.get("totalCount") instanceof Number)) {
                throw new IllegalStateException("전자결재 댓글 건수 조회 결과가 올바르지 않습니다.");
            }
            countsByOwnerId.put(
                ((Number) row.get("ownerId")).longValue(),
                ((Number) row.get("totalCount")).longValue());
        }

        Map<Long, List<CommonCommentVO>> rootsInPageByOwnerId = new HashMap<>();
        List<Long> userRootIds = new ArrayList<>();
        for (Long approvalId : approvalIds) {
            List<CommonCommentVO> roots = rootsByOwnerId.get(approvalId);
            int selectedCount = Math.min(limit, roots.size());
            List<CommonCommentVO> selectedRoots = new ArrayList<>(roots.subList(0, selectedCount));
            Collections.reverse(selectedRoots);
            rootsInPageByOwnerId.put(approvalId, selectedRoots);
            for (CommonCommentVO root : selectedRoots) {
                if ("USER".equals(root.getCommentType())) {
                    userRootIds.add(root.getCommentId());
                }
            }
        }

        List<CommonCommentVO> userThreads = Collections.emptyList();
        if (!userRootIds.isEmpty()) {
            Map<String, Object> threadParams = new HashMap<>();
            threadParams.put("tenantId", user.getTenantId());
            threadParams.put("ownerIds", approvalIds);
            threadParams.put("rootIds", userRootIds);
            userThreads = commonCommentDAO.selectApprovalUserCommentThreadsByRootIds(threadParams);
            if (userThreads == null) {
                throw new IllegalStateException("전자결재 댓글 답글 조회 결과가 없습니다.");
            }
        }

        Set<Long> commentIds = new LinkedHashSet<>();
        Map<Long, List<CommonCommentVO>> commentsByOwnerId = new HashMap<>();
        for (Long approvalId : approvalIds) {
            commentsByOwnerId.put(approvalId, new ArrayList<>());
        }
        for (CommonCommentVO comment : userThreads) {
            if (comment == null || comment.getOwnerId() == null || comment.getCommentId() == null) {
                throw new IllegalStateException("전자결재 댓글 답글 항목이 올바르지 않습니다.");
            }
            List<CommonCommentVO> ownerComments = commentsByOwnerId.get(comment.getOwnerId());
            if (ownerComments == null) {
                throw new IllegalStateException("전자결재 댓글 답글 항목이 올바르지 않습니다.");
            }
            ownerComments.add(comment);
            if (!"Y".equalsIgnoreCase(comment.getDeletedYn())) {
                commentIds.add(comment.getCommentId());
            }
        }

        Map<Long, List<CommonFileVO>> filesByCommentId = commentIds.isEmpty()
            ? Collections.<Long, List<CommonFileVO>>emptyMap()
            : commonFileService.listFilesByOwnerIds(
                user.getTenantId(), COMMENT_FILE_OWNER_TYPE, new ArrayList<>(commentIds));
        if (filesByCommentId == null) {
            throw new IllegalStateException("전자결재 댓글 첨부파일 조회 결과가 없습니다.");
        }
        for (List<CommonCommentVO> comments : commentsByOwnerId.values()) {
            for (CommonCommentVO comment : comments) {
                if ("Y".equalsIgnoreCase(comment.getDeletedYn())) {
                    comment.setContent("[삭제된 댓글입니다.]");
                    comment.setWriterName("삭제된 댓글");
                    comment.setWriterId(null);
                    comment.setAttachments(new ArrayList<>());
                } else {
                    List<CommonFileVO> attachments = filesByCommentId.getOrDefault(
                        comment.getCommentId(), Collections.emptyList());
                    comment.setAttachments(
                        attachments == null ? Collections.<CommonFileVO>emptyList() : attachments);
                }
            }
        }

        Map<Long, DocumentApprovalCommentPageVO> pagesByOwnerId = new HashMap<>();
        for (Long approvalId : approvalIds) {
            List<CommonCommentVO> roots = rootsByOwnerId.get(approvalId);
            int selectedCount = Math.min(limit, roots.size());
            boolean hasPrevious = roots.size() > limit;
            List<CommonCommentVO> selectedRoots = rootsInPageByOwnerId.get(approvalId);
            List<CommonCommentVO> systemEvents = new ArrayList<>();
            for (CommonCommentVO root : selectedRoots) {
                if ("SYSTEM".equals(root.getCommentType())) {
                    systemEvents.add(root);
                }
            }

            DocumentApprovalCommentPageVO page = new DocumentApprovalCommentPageVO();
            page.setComments(commentsByOwnerId.get(approvalId));
            page.setSystemEvents(systemEvents);
            page.setHasPrevious(hasPrevious);
            page.setNextBeforeCommentId(
                hasPrevious && selectedCount > 0 ? roots.get(selectedCount - 1).getCommentId() : null);
            page.setResultCnt(countsByOwnerId.getOrDefault(approvalId, 0L));
            pagesByOwnerId.put(approvalId, page);
        }
        return pagesByOwnerId;
    }

    @Override
    public Map<String, Object> approvalCommentParams(LoginVO user, Long electronicApprovalId, Long commentId) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("ownerType", OWNER_TYPE);
        params.put("ownerId", electronicApprovalId);
        if (commentId != null) {
            params.put("commentId", commentId);
        }
        return params;
    }
}
