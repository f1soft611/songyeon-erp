package egovframework.let.system.warehouses.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
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
import egovframework.let.system.warehouses.domain.model.SystemWarehouseSaveRequestVO;
import egovframework.let.system.warehouses.domain.model.SystemWarehouseVO;
import egovframework.let.system.warehouses.service.SystemWarehouseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 창고 관리를 위한 컨트롤러 클래스
 * @author S-ERP
 * @since 2026.09.09
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system/warehouses")
@Tag(name = "SystemWarehouseApiController", description = "창고 관리")
public class SystemWarehouseApiController {

    private final ResultVoHelper resultVoHelper;
    private final SystemWarehouseService systemWarehouseService;

    @Operation(summary = "창고 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemWarehouseApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @GetMapping
    public ResultVO listWarehouses(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", systemWarehouseService.listWarehouses(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "창고 등록", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemWarehouseApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "등록 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createWarehouse(
            @RequestBody SystemWarehouseSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemWarehouseVO warehouse = systemWarehouseService.createWarehouse(user.getTenantId(), resolveUserId(user), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", warehouse);
            resultMap.put("message", "창고가 성공적으로 등록되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    @Operation(summary = "창고 수정", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemWarehouseApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @PutMapping("/{id}")
    public ResultVO updateWarehouse(
            @PathVariable Long id,
            @RequestBody SystemWarehouseSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            SystemWarehouseVO warehouse = systemWarehouseService.updateWarehouse(user.getTenantId(), resolveUserId(user), id, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", warehouse);
            resultMap.put("message", "창고가 성공적으로 수정되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    @Operation(summary = "창고 삭제", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SystemWarehouseApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "삭제 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @DeleteMapping("/{id}")
    public ResultVO deleteWarehouse(
            @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            systemWarehouseService.deleteWarehouse(user.getTenantId(), id);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("message", "창고가 성공적으로 삭제되었습니다.");
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

    /**
     * 인증 주체의 숫자형 사용자 ID(tb_user.user_id) 를 반환한다.
     * LoginVO.uniqId 는 로그인/JWT 에서 user_id 를 문자열로 담고 있으므로 Long 으로 변환한다.
     * 값이 없거나 숫자가 아니면 null 을 반환한다.
     */
    private Long resolveUserId(LoginVO user) {
        if (user == null || !StringUtils.hasText(user.getUniqId())) {
            return null;
        }
        try {
            return Long.valueOf(user.getUniqId().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
