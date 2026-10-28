package egovframework.com.common.controller;

import java.util.HashMap;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonCommentSearchVO;
import egovframework.com.common.service.CommonCommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "CommonCommentApiController", description = "공통 댓글 API")
public class CommonCommentApiController {

    private final ResultVoHelper resultVoHelper;
    private final CommonCommentService commonCommentService;

    public CommonCommentApiController(ResultVoHelper resultVoHelper, CommonCommentService commonCommentService) {
        this.resultVoHelper = resultVoHelper;
        this.commonCommentService = commonCommentService;
    }

    @Operation(summary = "공통 댓글 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/common/comments")
    public ResultVO listComments(
            @ModelAttribute CommonCommentSearchVO search,
            @RequestParam(defaultValue = "3") Integer limit,
            @RequestParam(required = false) Integer pageUnit,
            @RequestParam(required = false) Long beforeCommentId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (search.getOwnerType() == null || search.getOwnerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 대상 정보가 올바르지 않습니다.");
        }
        requireNonApprovalOwnerType(search.getOwnerType());
        search.setTenantId(user.getTenantId());
        search.setPageUnit(pageUnit != null ? pageUnit : limit);
        search.setBeforeCommentId(beforeCommentId);
        HashMap<String, Object> resultMap = new HashMap<>();
        CommonCommentPageVO commentPage = commonCommentService.listComments(
            user.getTenantId(), search.getOwnerType(), search.getOwnerId(),
            search.getRecordCountPerPage(), beforeCommentId);
        List<CommonCommentVO> comments = commentPage.getComments();
        resultMap.put("resultList", comments);
        resultMap.put("comments", comments);
        resultMap.put("hasPrevious", commentPage.isHasPrevious());
        resultMap.put("nextBeforeCommentId", commentPage.getNextBeforeCommentId());
        resultMap.put("resultCnt", commentPage.getResultCnt());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공통 댓글 등록", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/common/comments")
    public ResponseEntity<ResultVO> createComment(
            @RequestBody CommonCommentCreateRequest request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (request == null || !StringUtils.hasText(request.getOwnerType()) || request.getOwnerId() == null || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 정보가 올바르지 않습니다.");
        }
        requireNonApprovalOwnerType(request.getOwnerType());

        CommonCommentVO created = commonCommentService.createComment(user.getTenantId(), request.getOwnerType(), request.getOwnerId(),
                request.getContent(), user.getId(), user.getName(), request.getParentCommentId());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", created);
        resultMap.put("message", "댓글이 등록되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공통 댓글 수정", security = @SecurityRequirement(name = "Authorization"))
    @PutMapping("/common/comments/{commentId}")
    public ResponseEntity<ResultVO> updateComment(
            @PathVariable Long commentId,
            @RequestBody CommonCommentUpdateRequest request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (commentId == null || request == null || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 수정 정보가 올바르지 않습니다.");
        }

        CommonCommentVO updated = commonCommentService.updateComment(user.getTenantId(), commentId, request.getContent(), user.getId(), user.getName());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", updated);
        resultMap.put("message", "댓글이 수정되었습니다.");
        return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공통 댓글 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/common/comments/{commentId}")
    public ResultVO deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        commonCommentService.deleteComment(user.getTenantId(), commentId, user.getId(), user.getName());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "댓글이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private void requireNonApprovalOwnerType(String ownerType) {
        if ("APPROVAL".equalsIgnoreCase(ownerType.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "전자결재 댓글은 전용 권한 확인 경로를 사용해야 합니다.");
        }
    }

    public static class CommonCommentCreateRequest {
        private String ownerType;
        private Long ownerId;
        private String content;
        private Long parentCommentId;

        public String getOwnerType() { return ownerType; }
        public void setOwnerType(String ownerType) { this.ownerType = ownerType; }
        public Long getOwnerId() { return ownerId; }
        public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public Long getParentCommentId() { return parentCommentId; }
        public void setParentCommentId(Long parentCommentId) { this.parentCommentId = parentCommentId; }
    }

    public static class CommonCommentUpdateRequest {
        private String content;

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
