package egovframework.let.groupware.approval.shared.controller;

import java.util.HashMap;
import java.util.List;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalActionRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.shared.service.DocumentApprovalInteractionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/groupware/approvals")
@Tag(name = "DocumentApprovalInteractionApiController", description = "전자결재 공통 업무 API")
public class DocumentApprovalInteractionApiController {

    private final ResultVoHelper resultVoHelper;
    private final DocumentApprovalInteractionService documentApprovalService;

    public DocumentApprovalInteractionApiController(ResultVoHelper resultVoHelper,
            DocumentApprovalInteractionService documentApprovalService) {
        this.resultVoHelper = resultVoHelper;
        this.documentApprovalService = documentApprovalService;
    }

    @Operation(summary = "전자결재 문서 결재신청", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/submit")
    public ResultVO submit(@PathVariable Long electronicApprovalId,
            @RequestBody DocumentApprovalDraftSaveRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.submit(user, electronicApprovalId, request));
        resultMap.put("message", "문서가 결재신청되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 결재신청 취소", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/submission-cancellation")
    public ResultVO cancelSubmission(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.cancelSubmission(user, electronicApprovalId));
        resultMap.put("message", "결재신청이 취소되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 승인 취소", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/approval-cancellation")
    public ResultVO cancelApproval(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.cancelApproval(user, electronicApprovalId));
        resultMap.put("message", "승인이 취소되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 결재 처리", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/actions")
    public ResultVO processAction(@PathVariable Long electronicApprovalId,
            @RequestBody DocumentApprovalActionRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.processAction(user, electronicApprovalId, request));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 문서 논리 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/{electronicApprovalId}")
    public ResultVO deleteDocumentApproval(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        documentApprovalService.deleteDocumentApproval(user, electronicApprovalId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "문서가 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "내 관련 문서 첨부파일 목록", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/files")
    public ResultVO listFiles(@RequestParam(defaultValue = "ALL") String scope,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) Long electronicApprovalId,
            @RequestParam(required = false) Long beforeFileId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalFilePageVO page = documentApprovalService.listFiles(
                user, scope, documentType, electronicApprovalId, beforeFileId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", page.getResultList());
        resultMap.put("hasNext", page.isHasNext());
        resultMap.put("nextBeforeFileId", page.getNextBeforeFileId());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 문서 상세 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/documents/{electronicApprovalId}")
    public ResultVO getDetail(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.getDetail(user, electronicApprovalId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 사용자 댓글 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/comments")
    public ResultVO listApprovalComments(@PathVariable Long electronicApprovalId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long beforeCommentId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalCommentPageVO page = documentApprovalService.listApprovalComments(
                user, electronicApprovalId, limit, beforeCommentId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", page.getComments());
        resultMap.put("comments", page.getComments());
        resultMap.put("resultCnt", page.getResultCnt());
        resultMap.put("systemEvents", page.getSystemEvents());
        resultMap.put("hasPrevious", page.isHasPrevious());
        resultMap.put("nextBeforeCommentId", page.getNextBeforeCommentId());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 사용자 댓글 작성", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/comments")
    public ResponseEntity<ResultVO> createApprovalComment(@PathVariable Long electronicApprovalId,
            @RequestBody DocumentApprovalCommentRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        CommonCommentVO created = documentApprovalService.createApprovalComment(
                user, electronicApprovalId, request.getContent(), request.getParentCommentId());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", created);
        resultMap.put("message", "댓글이 등록되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 사용자 댓글 수정", security = @SecurityRequirement(name = "Authorization"))
    @PutMapping("/{electronicApprovalId}/comments/{commentId}")
    public ResultVO updateApprovalComment(@PathVariable Long electronicApprovalId,
            @PathVariable Long commentId, @RequestBody DocumentApprovalCommentRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.updateApprovalComment(
                user, electronicApprovalId, commentId, request.getContent()));
        resultMap.put("message", "댓글이 수정되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 사용자 댓글 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/{electronicApprovalId}/comments/{commentId}")
    public ResultVO deleteApprovalComment(@PathVariable Long electronicApprovalId,
            @PathVariable Long commentId, @AuthenticationPrincipal LoginVO user) throws Exception {
        documentApprovalService.deleteApprovalComment(user, electronicApprovalId, commentId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "댓글이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 댓글 첨부 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/comments/{commentId}/attachments")
    public ResultVO listApprovalCommentAttachments(@PathVariable Long electronicApprovalId,
            @PathVariable Long commentId, @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", documentApprovalService.listApprovalCommentAttachments(
                user, electronicApprovalId, commentId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 댓글 첨부 업로드", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/comments/{commentId}/attachments")
    public ResponseEntity<ResultVO> uploadApprovalCommentAttachment(@PathVariable Long electronicApprovalId,
            @PathVariable Long commentId, @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        CommonFileVO uploaded = documentApprovalService.uploadApprovalCommentAttachment(
                user, electronicApprovalId, commentId, file);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", uploaded);
        resultMap.put("message", "댓글 첨부파일이 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 댓글 첨부 다운로드", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/comments/{commentId}/attachments/{fileId}/download")
    public void downloadApprovalCommentAttachment(@PathVariable Long electronicApprovalId,
            @PathVariable Long commentId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user, HttpServletResponse response) throws Exception {
        documentApprovalService.downloadApprovalCommentAttachment(
                user, electronicApprovalId, commentId, fileId, response);
    }

    @Operation(summary = "전자결재 댓글 첨부 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/{electronicApprovalId}/comments/{commentId}/attachments/{fileId}")
    public ResultVO deleteApprovalCommentAttachment(@PathVariable Long electronicApprovalId,
            @PathVariable Long commentId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        documentApprovalService.deleteApprovalCommentAttachment(user, electronicApprovalId, commentId, fileId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "댓글 첨부파일이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 임시저장 첨부 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/attachments")
    public ResultVO listAttachments(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", documentApprovalService.listAttachments(user, electronicApprovalId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 임시저장 첨부 업로드", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/attachments")
    public ResponseEntity<ResultVO> uploadAttachment(@PathVariable Long electronicApprovalId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        CommonFileVO uploaded = documentApprovalService.uploadAttachment(user, electronicApprovalId, file);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", uploaded);
        resultMap.put("message", "첨부파일이 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 임시저장 첨부 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/{electronicApprovalId}/attachments/{fileId}")
    public ResultVO deleteAttachment(@PathVariable Long electronicApprovalId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        documentApprovalService.deleteAttachment(user, electronicApprovalId, fileId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "첨부파일이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 임시저장 첨부 다운로드", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/attachments/{fileId}/download")
    public void downloadAttachment(@PathVariable Long electronicApprovalId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user, HttpServletResponse response) throws Exception {
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }
        documentApprovalService.downloadAttachment(user, electronicApprovalId, fileId, response);
    }

    @Operation(summary = "전자결재 본문 이미지 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/embedded-images/{fileId}")
    public void streamEmbeddedImage(@PathVariable Long electronicApprovalId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user, HttpServletResponse response) throws Exception {
        documentApprovalService.streamEmbeddedImage(user, electronicApprovalId, fileId, response);
    }
}
