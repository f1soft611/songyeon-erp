package egovframework.let.system.roles.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionEntry;
import egovframework.let.system.menus.domain.model.SystemMenuRolePermissionSaveRequestVO;
import egovframework.let.system.menus.service.SystemMenuService;
import egovframework.let.system.roles.domain.model.SystemRoleSaveRequestVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserAssignRequestVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserMapListVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserVO;
import egovframework.let.system.roles.domain.model.SystemRoleVO;
import egovframework.let.system.roles.service.SystemRoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 역할 관리를 위한 컨트롤러 클래스 (목록/등록/수정만 제공, 삭제는 제외)
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@RestController
@RequestMapping("/api/v1/system/roles")
@Tag(name = "SystemRoleApiController", description = "역할 관리")
public class SystemRoleApiController {

    private final ResultVoHelper resultVoHelper;
    private final SystemMenuService systemMenuService;
    private final SystemRoleService systemRoleService;

    public SystemRoleApiController(ResultVoHelper resultVoHelper, SystemRoleService systemRoleService) {
        this(resultVoHelper, null, systemRoleService);
    }

    @Autowired
    public SystemRoleApiController(ResultVoHelper resultVoHelper, SystemMenuService systemMenuService,
            SystemRoleService systemRoleService) {
        this.resultVoHelper = resultVoHelper;
        this.systemMenuService = systemMenuService;
        this.systemRoleService = systemRoleService;
    }

    @Operation(summary = "역할 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemRoleApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @GetMapping
    public ResultVO listRoles(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", systemRoleService.listRoles(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "역할 등록", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemRoleApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "등록 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createRole(
            @RequestBody SystemRoleSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemRoleVO role = systemRoleService.createRole(user.getTenantId(), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", role);
            resultMap.put("message", "역할이 성공적으로 등록되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (Exception ex) {
            return buildInputErrorResult(ex.getMessage());
        }
    }

    @Operation(summary = "역할 수정", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemRoleApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PutMapping("/{id}")
    public ResultVO updateRole(
            @PathVariable Long id,
            @RequestBody SystemRoleSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemRoleVO role = systemRoleService.updateRole(user.getTenantId(), id, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", role);
            resultMap.put("message", "역할이 성공적으로 수정되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (Exception ex) {
            return buildInputErrorResult(ex.getMessage());
        }
    }

    @Operation(summary = "역할 사용자 매핑 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemRoleApiController" })
    @GetMapping("/{roleId}/users")
    public ResultVO listRoleUsers(
            @PathVariable Long roleId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        SystemRoleUserMapListVO result = systemRoleService.listRoleUsers(user.getTenantId(), roleId);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("assignedUsers", result.getAssignedUsers());
        resultMap.put("unassignedUsers", result.getUnassignedUsers());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "역할 메뉴 권한 일괄 저장", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemRoleApiController" })
    @PutMapping("/{roleId}/menu-permissions")
    public ResultVO replaceRoleMenuPermissions(
            @PathVariable Long roleId,
            @RequestBody SystemMenuRolePermissionSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            if (payload == null || payload.getMenuPermissions() == null) {
                throw new IllegalArgumentException("저장할 메뉴 권한 정보가 없습니다.");
            }
            systemMenuService.replaceRoleMenuPermissions(user.getTenantId(), roleId, payload.getMenuPermissions());
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("message", "역할 메뉴 권한이 저장되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (Exception ex) {
            return buildInputErrorResult(ex.getMessage());
        }
    }

    @Operation(summary = "역할 사용자 연결 추가", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemRoleApiController" })
    @PostMapping("/{roleId}/users")
    public ResultVO assignUserToRole(
            @PathVariable Long roleId,
            @RequestBody SystemRoleUserAssignRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemRoleUserVO userMapping = systemRoleService.assignUserToRole(user.getTenantId(), roleId, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", userMapping);
            resultMap.put("message", "역할 사용자 매핑이 추가되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (Exception ex) {
            return buildInputErrorResult(ex.getMessage());
        }
    }

    @Operation(summary = "역할 사용자 연결 해제", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemRoleApiController" })
    @DeleteMapping("/{roleId}/users/{loginId}")
    public ResultVO removeUserFromRole(
            @PathVariable Long roleId,
            @PathVariable Long loginId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            boolean deleted = systemRoleService.removeUserFromRole(user.getTenantId(), roleId, loginId);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("deleted", deleted);
            resultMap.put("message", deleted ? "권한 사용자 매핑이 삭제되었습니다." : "삭제 대상 사용자가 없습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (Exception ex) {
            return buildInputErrorResult(ex.getMessage());
        }
    }

    private ResultVO buildInputErrorResult(String rawMessage) {
        String message = rawMessage;
        if (message == null || message.trim().isEmpty()) {
            message = "처리 중 오류가 발생했습니다.";
        }
        String lower = message.toLowerCase();
        if (lower.contains("duplicate") || lower.contains("already") || lower.contains("unique")) {
            message = "이미 연결된 사용자입니다.";
        } else if (lower.contains("not found") || lower.contains("찾을 수 없습니다")) {
            message = "대상 정보를 찾을 수 없습니다.";
        } else if (lower.contains("constraint") || lower.contains("foreign key")) {
            message = "연결 정보를 확인해 주세요.";
        }

        Map<String, Object> errorMap = new HashMap<>();
        errorMap.put("message", message);
        return resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR, message);
    }

    private void requireAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }
}
