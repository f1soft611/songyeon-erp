package egovframework.let.system.permissions.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.permissions.service.SystemPermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 권한 마스터 조회를 위한 컨트롤러 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system/permissions")
@Tag(name = "SystemPermissionApiController", description = "권한 마스터 관리")
public class SystemPermissionApiController {

    private final ResultVoHelper resultVoHelper;
    private final SystemPermissionService systemPermissionService;

    @Operation(summary = "활성 권한 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemPermissionApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @GetMapping
    public ResultVO listPermissions(
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", systemPermissionService.listActivePermissions());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private void requireAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }
}