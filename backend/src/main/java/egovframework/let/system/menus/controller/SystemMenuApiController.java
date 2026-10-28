package egovframework.let.system.menus.controller;

import java.util.HashMap;
import java.util.Map;

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
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;
import egovframework.let.system.menus.service.SystemMenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 메뉴 관리를 위한 컨트롤러 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system/menus")
@Tag(name = "SystemMenuApiController", description = "메뉴 관리")
public class SystemMenuApiController {

    private final ResultVoHelper resultVoHelper;
    private final SystemMenuService systemMenuService;

    @Operation(summary = "메뉴 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemMenuApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @GetMapping
    public ResultVO listMenus(
            @RequestParam(required = false) Long moduleId,
            @RequestParam(required = false) Long roleId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        if (roleId == null) {
            resultMap.put("resultList", systemMenuService.listMenus(user.getTenantId(), moduleId));
        } else {
            resultMap.put("resultList", systemMenuService.listMenus(user.getTenantId(), moduleId, roleId));
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "메뉴 등록", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemMenuApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "등록 성공"),
            @ApiResponse(responseCode = "400", description = "유효하지 않은 모듈 또는 상위 메뉴"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PostMapping
    public ResponseEntity<ResultVO> createMenu(
            @RequestBody SystemMenuSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemMenuVO menu = systemMenuService.createMenu(user.getTenantId(), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", menu);
            resultMap.put("message", "메뉴가 성공적으로 등록되었습니다.");
                return ResponseEntity.status(HttpStatus.CREATED)
                    .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
        }
    }

    @Operation(summary = "메뉴 수정", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemMenuApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "400", description = "유효하지 않은 상위 메뉴"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PutMapping("/{id}")
    public ResponseEntity<ResultVO> updateMenu(
            @PathVariable Long id,
            @RequestBody SystemMenuSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemMenuVO menu = systemMenuService.updateMenu(user.getTenantId(), id, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", menu);
            resultMap.put("message", "메뉴가 성공적으로 수정되었습니다.");
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
        }
    }

    @Operation(summary = "메뉴 버튼 권한 저장", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemMenuApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "저장 성공"),
            @ApiResponse(responseCode = "400", description = "리프 메뉴가 아니거나 유효하지 않은 권한 코드 요청"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PutMapping("/{id}/permissions")
    public ResponseEntity<ResultVO> replaceMenuPermissions(
            @PathVariable Long id,
            @RequestBody SystemMenuPermissionSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemMenuVO menu = systemMenuService.replaceMenuPermissions(user.getTenantId(), id, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", menu);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
        }
    }

    @Operation(summary = "메뉴 삭제", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemMenuApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "삭제 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @DeleteMapping("/{id}")
    public ResultVO deleteMenu(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            systemMenuService.deleteMenu(user.getTenantId(), id);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("message", "메뉴가 성공적으로 삭제되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    private void requireAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }
}
