package egovframework.com.common.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonCommentSearchVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.CommonCommentService;
import egovframework.let.common.dto.ListResult;
import egovframework.let.common.pagination.EgovPaginationSupport;

@Service("commonCommentService")
public class CommonCommentServiceImpl extends EgovAbstractServiceImpl implements CommonCommentService {

    private final CommonCommentDAO commonCommentDAO;

    @Autowired
    public CommonCommentServiceImpl(CommonCommentDAO commonCommentDAO) {
        this.commonCommentDAO = commonCommentDAO;
    }

    @Override
    public List<CommonCommentVO> listComments(Long tenantId, String ownerType, Long ownerId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 대상 정보가 올바르지 않습니다.");
        }

        requireDao();

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        List<CommonCommentVO> comments = commonCommentDAO.selectCommonCommentList(params);
        markDeletedComments(comments);
        return comments == null ? new ArrayList<>() : comments;
    }

    @Override
    public Map<Long, List<CommonCommentVO>> listCommentsByOwnerIds(Long tenantId, String ownerType, List<Long> ownerIds, Integer limit) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerIds == null || ownerIds.isEmpty()) {
            return new HashMap<>();
        }
        int safeLimit = limit == null ? 3 : limit;
        if (safeLimit < 1 || safeLimit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 조회 건수가 올바르지 않습니다.");
        }

        Set<Long> distinctIds = new HashSet<>();
        for (Long ownerId : ownerIds) {
            if (ownerId != null) {
                distinctIds.add(ownerId);
            }
        }
        if (distinctIds.isEmpty()) {
            return new HashMap<>();
        }

        requireDao();
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerIds", new ArrayList<>(distinctIds));
        params.put("limit", safeLimit);

        List<CommonCommentVO> fetched = commonCommentDAO.selectCommonCommentPageByOwnerIds(params);
        Map<Long, List<CommonCommentVO>> grouped = new HashMap<>();
        for (Long ownerId : distinctIds) {
            grouped.put(ownerId, new ArrayList<CommonCommentVO>());
        }
        if (fetched != null) {
            for (CommonCommentVO comment : fetched) {
                if (comment == null || comment.getOwnerId() == null) {
                    continue;
                }
                grouped.computeIfAbsent(comment.getOwnerId(), key -> new ArrayList<>()).add(comment);
            }
        }
        for (List<CommonCommentVO> comments : grouped.values()) {
            markDeletedComments(comments);
        }
        return grouped;
    }

    @Override
    public Map<Long, CommonCommentPageVO> listCommentPagesByOwnerIds(
            Long tenantId, String ownerType, List<Long> ownerIds, Integer limit) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerIds == null || ownerIds.isEmpty()) {
            return new HashMap<>();
        }
        int safeLimit = limit == null ? 3 : limit;
        if (safeLimit < 1 || safeLimit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 조회 건수가 올바르지 않습니다.");
        }

        Set<Long> distinctIds = new HashSet<>();
        for (Long ownerId : ownerIds) {
            if (ownerId != null) {
                distinctIds.add(ownerId);
            }
        }
        if (distinctIds.isEmpty()) {
            return new HashMap<>();
        }

        requireDao();
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerIds", new ArrayList<>(distinctIds));
        params.put("limit", safeLimit + 1);

        List<CommonCommentVO> fetched = commonCommentDAO.selectCommonCommentPageByOwnerIds(params);
        Map<Long, List<List<CommonCommentVO>>> rootGroupsByOwnerId = new HashMap<>();
        for (Long ownerId : distinctIds) {
            rootGroupsByOwnerId.put(ownerId, new ArrayList<>());
        }
        if (fetched != null) {
            for (CommonCommentVO comment : fetched) {
                if (comment == null || comment.getOwnerId() == null) {
                    continue;
                }
                List<List<CommonCommentVO>> rootGroups =
                    rootGroupsByOwnerId.computeIfAbsent(comment.getOwnerId(), key -> new ArrayList<>());
                if (comment.getParentCommentId() == null || rootGroups.isEmpty()) {
                    rootGroups.add(new ArrayList<>());
                }
                rootGroups.get(rootGroups.size() - 1).add(comment);
            }
        }

        Map<Long, Long> countsByOwnerId = countCommentsByOwnerIds(
            tenantId, ownerType, new ArrayList<>(distinctIds));
        Map<Long, CommonCommentPageVO> pagesByOwnerId = new HashMap<>();
        for (Long ownerId : distinctIds) {
            List<List<CommonCommentVO>> rootGroups =
                rootGroupsByOwnerId.getOrDefault(ownerId, Collections.emptyList());
            boolean hasPrevious = rootGroups.size() > safeLimit;
            List<CommonCommentVO> comments = new ArrayList<>();
            int selectedRootCount = Math.min(safeLimit, rootGroups.size());
            for (int groupIndex = selectedRootCount - 1; groupIndex >= 0; groupIndex--) {
                comments.addAll(rootGroups.get(groupIndex));
            }
            markDeletedComments(comments);

            CommonCommentPageVO page = new CommonCommentPageVO();
            page.setComments(comments);
            page.setHasPrevious(hasPrevious);
            page.setNextBeforeCommentId(
                hasPrevious && !comments.isEmpty() ? comments.get(0).getCommentId() : null);
            page.setResultCnt(countsByOwnerId.getOrDefault(ownerId, 0L));
            pagesByOwnerId.put(ownerId, page);
        }
        return pagesByOwnerId;
    }

    @Override
    public CommonCommentPageVO listComments(Long tenantId, String ownerType, Long ownerId, Integer limit, Long beforeCommentId) throws Exception {
        validateListRequest(tenantId, ownerType, ownerId);
        int safeLimit = limit == null ? 3 : limit;
        if (safeLimit < 1 || safeLimit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 조회 건수가 올바르지 않습니다.");
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        params.put("beforeCommentId", beforeCommentId);
        params.put("limit", safeLimit + 1);

        requireDao();
        List<CommonCommentVO> fetched = commonCommentDAO.selectCommonCommentPage(params);
        if (fetched == null) {
            fetched = new ArrayList<>();
        }

        List<List<CommonCommentVO>> rootGroups = new ArrayList<>();
        for (CommonCommentVO comment : fetched) {
            if (comment.getParentCommentId() == null || rootGroups.isEmpty()) {
                rootGroups.add(new ArrayList<>());
            }
            rootGroups.get(rootGroups.size() - 1).add(comment);
        }

        boolean hasPrevious = rootGroups.size() > safeLimit;
        List<CommonCommentVO> comments = new ArrayList<>();
        int selectedRootCount = Math.min(safeLimit, rootGroups.size());
        for (int groupIndex = selectedRootCount - 1; groupIndex >= 0; groupIndex--) {
            comments.addAll(rootGroups.get(groupIndex));
        }
        markDeletedComments(comments);

        CommonCommentPageVO page = new CommonCommentPageVO();
        page.setComments(comments);
        page.setHasPrevious(hasPrevious);
        page.setNextBeforeCommentId(hasPrevious && !comments.isEmpty() ? comments.get(0).getCommentId() : null);
        return page;
    }

    @Override
    public ListResult<CommonCommentVO> listComments(CommonCommentSearchVO search) throws Exception {
        if (search == null) {
            search = new CommonCommentSearchVO();
        }
        EgovPaginationSupport.apply(search, null);
        CommonCommentPageVO page = listComments(
            search.getTenantId(),
            search.getOwnerType(),
            search.getOwnerId(),
            search.getRecordCountPerPage(),
            search.getBeforeCommentId()
        );
        return new ListResult<>(
            page.getComments(),
            countComments(search.getTenantId(), search.getOwnerType(), search.getOwnerId())
        );
    }

    private void markDeletedComments(List<CommonCommentVO> comments) {
        if (comments == null) {
            return;
        }
        for (CommonCommentVO comment : comments) {
            if (comment != null && "Y".equalsIgnoreCase(comment.getDeletedYn())) {
                comment.setContent("[삭제된 댓글입니다.]");
                comment.setWriterName("삭제된 댓글");
                comment.setWriterId(null);
                comment.setAttachments(new ArrayList<>());
            }
        }
    }

    @Override
    public long countComments(Long tenantId, String ownerType, Long ownerId) throws Exception {
        validateListRequest(tenantId, ownerType, ownerId);
        requireDao();
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        Long count = commonCommentDAO.countCommonComments(params);
        return count == null ? 0L : count;
    }

    @Override
    public Map<Long, Long> countCommentsByOwnerIds(Long tenantId, String ownerType, List<Long> ownerIds) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerIds == null || ownerIds.isEmpty()) {
            return new HashMap<>();
        }
        Set<Long> distinctIds = new HashSet<>();
        for (Long ownerId : ownerIds) {
            if (ownerId != null) {
                distinctIds.add(ownerId);
            }
        }
        if (distinctIds.isEmpty()) {
            return new HashMap<>();
        }

        requireDao();
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerIds", new ArrayList<>(distinctIds));

        List<Map<String, Object>> rows = commonCommentDAO.selectCommonCommentCountsByOwnerIds(params);
        Map<Long, Long> countsByOwnerId = new HashMap<>();
        if (rows != null) {
            for (Map<String, Object> row : rows) {
                Object ownerIdValue = row.get("ownerId");
                Object countValue = row.get("totalCount");
                if (ownerIdValue == null || countValue == null) {
                    continue;
                }
                Long ownerId = null;
                if (ownerIdValue instanceof Number) {
                    ownerId = ((Number) ownerIdValue).longValue();
                } else {
                    ownerId = Long.valueOf(ownerIdValue.toString());
                }
                long count = countValue instanceof Number ? ((Number) countValue).longValue() : Long.parseLong(countValue.toString());
                countsByOwnerId.put(ownerId, count);
            }
        }
        for (Long ownerId : distinctIds) {
            countsByOwnerId.putIfAbsent(ownerId, 0L);
        }
        return countsByOwnerId;
    }

    private void validateListRequest(Long tenantId, String ownerType, Long ownerId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 대상 정보가 올바르지 않습니다.");
        }
    }

    private void requireDao() {
        if (commonCommentDAO == null) {
            throw new IllegalStateException("공통 댓글 DAO가 구성되지 않았습니다.");
        }
    }

    @Override
    @Transactional
    public CommonCommentVO createComment(Long tenantId, String ownerType, Long ownerId, String content, String writerId, String writerName, Long parentCommentId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null || !StringUtils.hasText(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 정보가 올바르지 않습니다.");
        }

        String normalizedContent = content.trim();
        if (!StringUtils.hasText(normalizedContent)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 내용을 입력해 주세요.");
        }

        requireDao();
        String normalizedOwnerType = ownerType.trim().toUpperCase();
        validateParentComment(tenantId, normalizedOwnerType, ownerId, parentCommentId);

        CommonCommentVO created = new CommonCommentVO();
        created.setTenantId(tenantId);
        created.setOwnerType(normalizedOwnerType);
        created.setOwnerId(ownerId);
        created.setParentCommentId(parentCommentId);
        created.setContent(normalizedContent);
        created.setWriterId(writerId);
        created.setWriterName(writerName);
        created.setDeletedYn("N");

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", created.getOwnerType());
        params.put("ownerId", ownerId);
        params.put("parentCommentId", parentCommentId);
        params.put("content", normalizedContent);
        params.put("writerId", writerId);
        params.put("writerName", writerName);
        params.put("deletedYn", "N");
        Long commentId = commonCommentDAO.insertCommonComment(params);
        if (commentId == null) {
            throw new IllegalStateException("공통 댓글 등록 결과에서 댓글 ID를 확인할 수 없습니다.");
        }
        if (commentId.equals(parentCommentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글은 자기 자신을 상위 댓글로 지정할 수 없습니다.");
        }

        HashMap<String, Object> lookup = new HashMap<>();
        lookup.put("tenantId", tenantId);
        lookup.put("commentId", commentId);
        CommonCommentVO persisted = commonCommentDAO.selectCommonCommentById(lookup);
        if (persisted == null) {
            throw new IllegalStateException("등록된 공통 댓글을 다시 조회할 수 없습니다.");
        }
        return persisted;
    }

    @Override
    @Transactional
    public CommonCommentVO updateComment(Long tenantId, Long commentId, String content, String actorId) throws Exception {
        return updateComment(tenantId, commentId, content, actorId, null);
    }

    @Override
    @Transactional
    public CommonCommentVO updateComment(Long tenantId, Long commentId, String content, String actorId, String actorName) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (commentId == null || !StringUtils.hasText(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 수정 정보가 올바르지 않습니다.");
        }

        String normalizedContent = content.trim();
        if (!StringUtils.hasText(normalizedContent)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 내용을 입력해 주세요.");
        }
        requireDao();

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("commentId", commentId);
        params.put("content", normalizedContent);
        params.put("actorId", actorId);
        params.put("actorName", actorName);
        if (commonCommentDAO.updateCommonComment(params) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 댓글을 찾을 수 없습니다.");
        }

        HashMap<String, Object> lookup = new HashMap<>();
        lookup.put("tenantId", tenantId);
        lookup.put("commentId", commentId);
        CommonCommentVO persisted = commonCommentDAO.selectCommonCommentById(lookup);
        if (persisted == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정된 댓글을 다시 조회할 수 없습니다.");
        }
        return persisted;
    }

    @Override
    @Transactional
    public void deleteComment(Long tenantId, Long commentId, String actorId) throws Exception {
        deleteComment(tenantId, commentId, actorId, null);
    }

    @Override
    @Transactional
    public void deleteComment(Long tenantId, Long commentId, String actorId, String actorName) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (commentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 ID가 없습니다.");
        }

        requireDao();
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("commentId", commentId);
        params.put("actorId", actorId);
        params.put("actorName", actorName);
        if (commonCommentDAO.softDeleteCommonComment(params) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 댓글을 찾을 수 없습니다.");
        }
    }

    private void validateParentComment(Long tenantId, String ownerType, Long ownerId, Long parentCommentId) throws Exception {
        if (parentCommentId == null) {
            return;
        }
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("commentId", parentCommentId);
        CommonCommentVO parent = commonCommentDAO.selectCommonCommentById(params);
        if (parent == null
                || !ownerType.equals(parent.getOwnerType())
                || !ownerId.equals(parent.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상위 댓글이 같은 댓글 대상에 속하지 않습니다.");
        }
        if (!"USER".equalsIgnoreCase(parent.getCommentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시스템 댓글에는 답글을 등록할 수 없습니다.");
        }
    }
}
