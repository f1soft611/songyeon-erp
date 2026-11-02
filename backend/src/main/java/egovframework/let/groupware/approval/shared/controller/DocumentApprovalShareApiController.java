package egovframework.let.groupware.approval.shared.controller;

import java.util.HashMap;
import java.util.Collections;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.shared.service.DocumentApprovalShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/v1/groupware/approvals")
public class DocumentApprovalShareApiController {
    private final DocumentApprovalShareService sharing;
    private final ResultVoHelper results;

    public DocumentApprovalShareApiController(DocumentApprovalShareService sharing, ResultVoHelper results) {
        this.sharing = sharing;
        this.results = results;
    }

    @Operation(summary = "문서 공유 링크 발급", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/documents/{documentId}/share-link")
    public ResultVO issue(@PathVariable Long documentId, @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> result = new HashMap<>();
        result.put("item", Collections.singletonMap("token", sharing.issue(user, documentId)));
        return results.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공유 문서 미리보기", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/shared-document")
    public ResultVO resolve(@RequestParam String token, @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> result = new HashMap<>();
        result.put("item", sharing.resolve(user, token));
        return results.buildFromMap(result, ResponseCode.SUCCESS);
    }
}
