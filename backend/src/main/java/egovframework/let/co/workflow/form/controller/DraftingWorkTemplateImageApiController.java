package egovframework.let.co.workflow.form.controller;

import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateUploadVO;
import egovframework.let.co.workflow.form.service.DraftingWorkTemplateImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/workflow/forms")
@Tag(name = "DraftingWorkTemplateImageApiController", description = "기안양식 본문 이미지 관리")
public class DraftingWorkTemplateImageApiController {

    private final ResultVoHelper resultVoHelper;
    private final DraftingWorkTemplateImageService imageService;

    @Operation(summary = "기안양식 본문 이미지 임시 업로드", security = {
        @SecurityRequirement(name = "Authorization") })
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "업로드 성공"),
        @ApiResponse(responseCode = "400", description = "이미지 파일 오류"),
        @ApiResponse(responseCode = "403", description = "테넌트 관리자 권한 필요"),
        @ApiResponse(responseCode = "404", description = "기안양식을 찾을 수 없음"),
        @ApiResponse(responseCode = "413", description = "이미지 파일 크기 초과")
    })
    @PostMapping("/{draftingWorkCategoryId}/template-images/temp")
    public ResponseEntity<ResultVO> uploadTemporaryImage(
            @PathVariable Long draftingWorkCategoryId,
            @RequestParam("file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireTenantAdmin(user);
        DraftingWorkTemplateUploadVO image = imageService.uploadTemporaryImage(
                user.getTenantId(), draftingWorkCategoryId, file);
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("item", image);
        resultMap.put("message", "기안양식 본문 이미지가 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "기안양식 본문 임시 이미지 삭제", security = {
        @SecurityRequirement(name = "Authorization") })
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "삭제 성공"),
        @ApiResponse(responseCode = "400", description = "임시 이미지 정보 오류"),
        @ApiResponse(responseCode = "403", description = "테넌트 관리자 권한 필요"),
        @ApiResponse(responseCode = "404", description = "기안양식을 찾을 수 없음")
    })
    @DeleteMapping("/{draftingWorkCategoryId}/template-images/temp/{uploadToken}")
    public ResponseEntity<ResultVO> deleteTemporaryImage(
            @PathVariable Long draftingWorkCategoryId,
            @PathVariable String uploadToken,
            @RequestParam String fileName,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireTenantAdmin(user);
        imageService.deleteTemporaryImage(user.getTenantId(), draftingWorkCategoryId, uploadToken, fileName);
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("message", "기안양식 임시 이미지가 삭제되었습니다.");
        return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "기안양식 본문 이미지 조회", security = {
        @SecurityRequirement(name = "Authorization") })
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "이미지 조회 성공"),
        @ApiResponse(responseCode = "401", description = "인증되지 않은 사용자"),
        @ApiResponse(responseCode = "404", description = "이미지를 찾을 수 없음")
    })
    @GetMapping("/{draftingWorkCategoryId}/template-images/{fileId}")
    public void streamTemplateImage(
            @PathVariable Long draftingWorkCategoryId,
            @PathVariable Long fileId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user,
            HttpServletResponse response) throws Exception {
        requireAuthenticated(user);
        imageService.streamTemplateImage(user.getTenantId(), draftingWorkCategoryId, fileId, response);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private void requireTenantAdmin(LoginVO user) {
        requireAuthenticated(user);
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }
}