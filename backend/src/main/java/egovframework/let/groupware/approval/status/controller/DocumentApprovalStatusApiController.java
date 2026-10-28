package egovframework.let.groupware.approval.status.controller;

import java.util.HashMap;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.status.service.DocumentApprovalStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/groupware/approvals")
@Tag(name = "DocumentApprovalStatusApiController", description = "전자결재 문서현황 API")
public class DocumentApprovalStatusApiController {

    private final ResultVoHelper resultVoHelper;
    private final DocumentApprovalStatusService documentApprovalStatusService;

    public DocumentApprovalStatusApiController(ResultVoHelper resultVoHelper,
            DocumentApprovalStatusService documentApprovalStatusService) {
        this.resultVoHelper = resultVoHelper;
        this.documentApprovalStatusService = documentApprovalStatusService;
    }

    @Operation(summary = "전자결재 문서 현황 검색", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/documents/search")
    public ResultVO searchDocuments(@RequestParam(required = false, defaultValue = "ALL") String scope,
            @ModelAttribute DocumentApprovalListQueryVO query,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalListPageVO page = documentApprovalStatusService.searchDocuments(user, scope, query);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", page.getResultList());
        resultMap.put("totalRowCount", page.getTotalRowCount());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
