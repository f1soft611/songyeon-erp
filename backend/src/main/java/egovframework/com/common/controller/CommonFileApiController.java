package egovframework.com.common.controller;

import java.util.HashMap;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
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
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.service.CommonFileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "CommonFileApiController", description = "공통 파일 API")
public class CommonFileApiController {

    private final ResultVoHelper resultVoHelper;
    private final CommonFileService commonFileService;

    public CommonFileApiController(ResultVoHelper resultVoHelper, CommonFileService commonFileService) {
        this.resultVoHelper = resultVoHelper;
        this.commonFileService = commonFileService;
    }

    @Operation(summary = "공통 파일 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/common/files")
    public ResultVO listFiles(
            @RequestParam String ownerType,
            @RequestParam Long ownerId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
            requireNonApprovalOwnerType(ownerType);
            HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", commonFileService.listFiles(user.getTenantId(), ownerType, ownerId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공통 파일 업로드", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/common/files/upload")
    public ResponseEntity<ResultVO> uploadFile(
            @RequestParam String ownerType,
            @RequestParam Long ownerId,
            @RequestParam(required = false) String uploaderId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        requireNonApprovalOwnerType(ownerType);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }

        CommonFileVO uploaded = commonFileService.uploadFile(user.getTenantId(), ownerType, ownerId, file,
                uploaderId == null ? user.getId() : uploaderId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", uploaded);
        resultMap.put("message", "첨부파일이 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공통 파일 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/common/files/{fileId}")
    public ResultVO deleteFile(
            @PathVariable Long fileId,
            @RequestParam(required = false) String ownerType,
            @RequestParam(required = false) Long ownerId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (hasPartialOwner(ownerType, ownerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }
        requireNonApprovalOwnerType(ownerType);
        if (StringUtils.hasText(ownerType) && ownerId != null) {
            commonFileService.deleteFile(user.getTenantId(), ownerType, ownerId, fileId);
        } else {
            commonFileService.deleteFile(user.getTenantId(), fileId);
        }
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "첨부파일이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공통 파일 다운로드", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/common/files/{fileId}/download")
    public void downloadFile(
            @PathVariable Long fileId,
            @RequestParam(required = false) String ownerType,
            @RequestParam(required = false) Long ownerId,
            @AuthenticationPrincipal LoginVO user,
            HttpServletResponse response) throws Exception {
        requireAuthenticated(user);
        if (hasPartialOwner(ownerType, ownerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }
        requireNonApprovalOwnerType(ownerType);
        if (StringUtils.hasText(ownerType) && ownerId != null) {
            commonFileService.downloadFile(user.getTenantId(), ownerType, ownerId, fileId, response);
        } else {
            commonFileService.downloadFile(user.getTenantId(), fileId, response);
        }
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private boolean hasPartialOwner(String ownerType, Long ownerId) {
        return StringUtils.hasText(ownerType) != (ownerId != null);
    }

    private void requireNonApprovalOwnerType(String ownerType) {
        if (StringUtils.hasText(ownerType)
                && ("APPROVAL".equalsIgnoreCase(ownerType.trim())
                    || "APPROVAL_COMMENT".equalsIgnoreCase(ownerType.trim()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "전자결재 첨부는 전용 권한 확인 경로를 사용해야 합니다.");
        }
    }
}
