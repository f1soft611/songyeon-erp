package egovframework.let.groupware.approval.write.controller;

import java.util.HashMap;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalPinStateVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWritePageVO;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/groupware/approvals")
@Tag(name = "DocumentApprovalWriteApiController", description = "전자결재 문서작성 API")
public class DocumentApprovalWriteApiController {

    private final ResultVoHelper resultVoHelper;
    private final DocumentApprovalWriteService documentApprovalWriteService;

    public DocumentApprovalWriteApiController(ResultVoHelper resultVoHelper,
            DocumentApprovalWriteService documentApprovalWriteService) {
        this.resultVoHelper = resultVoHelper;
        this.documentApprovalWriteService = documentApprovalWriteService;
    }

    @Operation(summary = "전자결재 문서 임시저장", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/drafts")
    public ResponseEntity<ResultVO> createDraft(@RequestBody DocumentApprovalDraftSaveRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalDraftVO saved = documentApprovalWriteService.saveDraft(user, request);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", saved);
        resultMap.put("message", "문서가 임시저장되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 임시저장 문서 수정", security = @SecurityRequirement(name = "Authorization"))
    @PutMapping("/drafts/{electronicApprovalId}")
    public ResultVO updateDraft(@PathVariable Long electronicApprovalId,
            @RequestBody DocumentApprovalDraftSaveRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalDraftVO saved = documentApprovalWriteService.saveDraft(user, electronicApprovalId, request);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", saved);
        resultMap.put("message", "문서가 임시저장되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "내 관련 전자결재 문서 목록", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/documents")
    public ResultVO listDocuments(@RequestParam(required = false, defaultValue = "ALL") String scope,
            @RequestParam(required = false) Long electronicApprovalId,
            @RequestParam(required = false, defaultValue = "false") boolean includeDetails,
            @ModelAttribute DocumentApprovalListQueryVO query,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        boolean pageRequest = query.getOffset() != null || query.getLimit() != null;
        if (pageRequest && includeDetails) {
            DocumentApprovalWritePageVO<DocumentApprovalFeedItemVO> page =
                    documentApprovalWriteService.searchWriteFeedDocuments(user, scope, query);
            resultMap.put("resultList", page.getResultList());
            resultMap.put("totalRowCount", page.getTotalRowCount());
        } else if (pageRequest) {
            DocumentApprovalWritePageVO<DocumentApprovalListItemVO> page =
                    documentApprovalWriteService.searchWriteDocuments(user, scope, query);
            resultMap.put("resultList", page.getResultList());
            resultMap.put("totalRowCount", page.getTotalRowCount());
        } else if (includeDetails) {
            resultMap.put("resultList", documentApprovalWriteService.listFeedDocuments(
                    user, scope, query.getDocumentType(), electronicApprovalId));
        } else {
            resultMap.put("resultList", documentApprovalWriteService.listDocuments(
                    user, scope, query.getDocumentType(), electronicApprovalId));
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 문서 개인별 고정", security = @SecurityRequirement(name = "Authorization"))
    @PutMapping("/documents/{electronicApprovalId}/pin")
    public ResultVO pinDocument(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalPinStateVO state =
                documentApprovalWriteService.pinDocument(user, electronicApprovalId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", state);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 문서 개인별 고정 해제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/documents/{electronicApprovalId}/pin")
    public ResultVO unpinDocument(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalPinStateVO state =
                documentApprovalWriteService.unpinDocument(user, electronicApprovalId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", state);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "내 전자결재 고정 문서 목록", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/documents/pinned")
    public ResultVO listPinnedDocuments(@RequestParam(required = false, defaultValue = "ALL") String scope,
            @RequestParam(required = false) Long electronicApprovalId,
            @RequestParam(required = false, defaultValue = "false") boolean includeDetails,
            @ModelAttribute DocumentApprovalListQueryVO query,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        if (includeDetails) {
            List<DocumentApprovalFeedItemVO> resultList = documentApprovalWriteService.listPinnedFeedDocuments(
                    user, scope, query.getDocumentType(), electronicApprovalId);
            resultMap.put("resultList", resultList);
            resultMap.put("totalRowCount", Long.valueOf(resultList.size()));
        } else {
            List<DocumentApprovalListItemVO> resultList = documentApprovalWriteService.listPinnedDocuments(
                    user, scope, query.getDocumentType(), electronicApprovalId);
            resultMap.put("resultList", resultList);
            resultMap.put("totalRowCount", Long.valueOf(resultList.size()));
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "내 전자결재 요약 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/summary")
    public ResultVO getSummary(@AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        DocumentApprovalSummaryVO summary = documentApprovalWriteService.getSummary(user);
        resultMap.put("item", summary);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 임시 본문 이미지 업로드", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/embedded-images/temp")
    public ResponseEntity<ResultVO> uploadTemporaryEmbeddedImage(@RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        EmbeddedImageUploadVO uploaded = documentApprovalWriteService.uploadTemporaryEmbeddedImage(user, file);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", uploaded);
        resultMap.put("message", "본문 이미지가 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 임시 본문 이미지 정리", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/embedded-images/temp/{uploadToken}")
    public ResultVO deleteTemporaryEmbeddedImage(@PathVariable String uploadToken,
            @RequestParam String fileName, @AuthenticationPrincipal LoginVO user) throws Exception {
        documentApprovalWriteService.deleteTemporaryEmbeddedImage(user, uploadToken, fileName);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "본문 이미지가 정리되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
