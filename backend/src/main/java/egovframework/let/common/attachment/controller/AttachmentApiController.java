package egovframework.let.common.attachment.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletResponse;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.service.AttachmentService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 첨부 파일 컨트롤러 클래스 (송연 /api/attachments 를 S_ERP 규칙으로 옮김). 입고관리 서류등록이 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/attachments")
@Tag(name = "AttachmentApiController", description = "공통 - 첨부 파일")
public class AttachmentApiController {

    private static final String TAG = "AttachmentApiController";

    private final ResultVoHelper resultVoHelper;
    private final AttachmentService attachmentService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 2026-10-26 '누가' 는 로그인한 사원의 사번
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "파일 올리기(scope·refId·files) {saved, errors}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping
    public ResultVO upload(@RequestParam(name = "scope", required = false) String scope,
            @RequestParam(name = "refId", required = false) String refId,
            @RequestParam(name = "files", required = false) List<MultipartFile> files,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", attachmentService.upload(scope, refId, files, employeeId(user)));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "대상 하나의 첨부 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO list(@RequestParam(name = "scope", required = false) String scope,
            @RequestParam(name = "refId", required = false) String refId) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        // 문서함 파일은 폴더 권한을 따져야 해서 여기서는 내주지 않는다(문서함 API 로만)
        if (scope == null || !"receiving".equals(scope.trim()) || refId == null || refId.trim().isEmpty()) {
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.INPUT_CHECK_ERROR, "조회할 대상이 필요합니다");
        }
        List<AttachmentVO> rows = attachmentService.listByRefs(scope.trim(), Collections.singletonList(refId.trim())).get(refId.trim());
        resultMap.put("resultList", rows == null ? Collections.emptyList() : rows);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "파일 내려받기(올린 이름으로)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/{id}/download")
    public void download(@PathVariable("id") long id, HttpServletResponse response) throws Exception {
        AttachmentVO row;
        try {
            row = attachmentService.find(id);
        } catch (IllegalArgumentException ex) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write(ex.getMessage());
            return;
        }
        String encoded = URLEncoder.encode(row.getOrigName(), StandardCharsets.UTF_8.name()).replace("+", "%20");
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + encoded + "\"; filename*=UTF-8''" + encoded);
        response.setContentLengthLong(Files.size(attachmentService.pathOf(row)));
        Files.copy(attachmentService.pathOf(row), response.getOutputStream());
        response.flushBuffer();
    }

    @Operation(summary = "파일 지우기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/{id}")
    public ResultVO delete(@PathVariable("id") long id) throws Exception {
        try {
            attachmentService.delete(id);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO failed(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
