package egovframework.let.groupware.approval.controller;

import java.util.HashMap;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateRenameRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateVO;
import egovframework.let.groupware.approval.service.ApprovalLineTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/groupware/approvals/line-templates")
@Tag(name = "ApprovalLineTemplateApiController", description = "전자결재 자주 쓰는 결재선 API")
public class ApprovalLineTemplateApiController {

    private final ResultVoHelper resultVoHelper;
    private final ApprovalLineTemplateService templateService;

    public ApprovalLineTemplateApiController(ResultVoHelper resultVoHelper,
            ApprovalLineTemplateService templateService) {
        this.resultVoHelper = resultVoHelper;
        this.templateService = templateService;
    }

    @Operation(summary = "자주 쓰는 결재선 목록", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping
    public ResultVO listTemplates(@RequestParam String eabusNo,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        List<ApprovalLineTemplateVO> templates = templateService.listTemplates(user, eabusNo);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", templates);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "자주 쓰는 결재선 상세", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{templateId}")
    public ResultVO getTemplate(@PathVariable Long templateId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", templateService.getTemplate(user, templateId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "자주 쓰는 결재선 저장", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping
    public ResponseEntity<ResultVO> createTemplate(@RequestBody ApprovalLineTemplateSaveRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", templateService.createTemplate(user, request));
        resultMap.put("message", "자주 쓰는 결재선이 저장되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "자주 쓰는 결재선 이름 변경", security = @SecurityRequirement(name = "Authorization"))
    @PutMapping("/{templateId}")
    public ResultVO renameTemplate(@PathVariable Long templateId,
            @RequestBody ApprovalLineTemplateRenameRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", templateService.renameTemplate(user, templateId, request));
        resultMap.put("message", "자주 쓰는 결재선 이름이 변경되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "자주 쓰는 결재선 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/{templateId}")
    public ResultVO deleteTemplate(@PathVariable Long templateId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        templateService.deleteTemplate(user, templateId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "자주 쓰는 결재선이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
