package egovframework.let.system.modules.controller;

import java.util.HashMap;
import java.util.Map;

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
import egovframework.let.system.modules.domain.model.SystemModuleSaveRequestVO;
import egovframework.let.system.modules.domain.model.SystemModuleVO;
import egovframework.let.system.modules.service.SystemModuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 모듈 관리를 위한 컨트롤러 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system/modules")
@Tag(name = "SystemModuleApiController", description = "모듈 관리")
public class SystemModuleApiController {

    private final ResultVoHelper resultVoHelper;
    private final SystemModuleService systemModuleService;

    @Operation(summary = "모듈 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemModuleApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @GetMapping
    public ResultVO listModules(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", systemModuleService.listModules(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "모듈 등록", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemModuleApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "등록 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createModule(
            @RequestBody SystemModuleSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemModuleVO module = systemModuleService.createModule(user.getTenantId(), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", module);
            resultMap.put("message", "모듈이 성공적으로 등록되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    @Operation(summary = "모듈 수정", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemModuleApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PutMapping("/{id}")
    public ResultVO updateModule(
            @PathVariable Long id,
            @RequestBody SystemModuleSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemModuleVO module = systemModuleService.updateModule(user.getTenantId(), id, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", module);
            resultMap.put("message", "모듈이 성공적으로 수정되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    @Operation(summary = "모듈 삭제", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemModuleApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "삭제 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @DeleteMapping("/{id}")
    public ResultVO deleteModule(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            systemModuleService.deleteModule(user.getTenantId(), id);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("message", "모듈이 성공적으로 삭제되었습니다.");
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
