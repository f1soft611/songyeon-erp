package egovframework.let.groupware.approval.shared.controller;

import java.util.HashMap;
import java.util.Collections;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.shared.service.DocumentLinkPreviewService;
import egovframework.let.groupware.approval.shared.service.DocumentLinkPreviewVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/v1/groupware/approvals")
public class DocumentLinkPreviewApiController {
    private final DocumentLinkPreviewService previews;
    private final ResultVoHelper results;

    public DocumentLinkPreviewApiController(DocumentLinkPreviewService previews, ResultVoHelper results) {
        this.previews = previews;
        this.results = results;
    }

    @Operation(summary = "외부 링크 OG 미리보기", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/link-preview")
    public ResultVO preview(@RequestBody DocumentLinkPreviewRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        if (user == null || user.getId() == null || user.getId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        DocumentLinkPreviewVO item = previews.preview(request == null ? null : request.getUrl());
        HashMap<String, Object> result = new HashMap<>();
        result.put("item", item);
        return results.buildFromMap(result, ResponseCode.SUCCESS);
    }
}
