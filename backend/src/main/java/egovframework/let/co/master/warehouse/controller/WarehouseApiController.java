package egovframework.let.co.master.warehouse.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.service.WarehouseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 기초정보 > 창고등록 컨트롤러 클래스
 * (송연 /api/cm/cm0001/warehouses 를 S_ERP 규칙으로 옮김. 송연에는 권한 개념이 없어 로그인 사용자 모두 사용)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_warehouse 로 변경, 등록자 · 수정자 기록)
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/warehouse")
@Tag(name = "WarehouseApiController", description = "기초정보 - 창고등록")
public class WarehouseApiController {

    private final ResultVoHelper resultVoHelper;
    private final WarehouseService warehouseService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 로그인한 사원의 사번(employees.id = LoginVO.uniqId, 예: 0000). 등록자 · 수정자에 그대로 넣는다
    // 2026-10-22: 로그인 uniqId 가 tb_user 번호가 되어 사번은 도우미로 찾는다
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "창고 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "WarehouseApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listWarehouses(@RequestParam(value = "includeUnused", required = false, defaultValue = "false") boolean includeUnused) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", warehouseService.listWarehouses(includeUnused));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "창고 등록", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "WarehouseApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "등록 성공") })
    @PostMapping
    public ResultVO createWarehouse(@RequestBody WarehouseSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            warehouseService.createWarehouse(payload, employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "창고 수정(이름을 바꾸면 쓰던 곳도 같이 바꿈)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "WarehouseApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "수정 성공. result.moved = 같이 옮긴 원재료 수") })
    @PutMapping("/{id}")
    public ResultVO updateWarehouse(@PathVariable Long id, @RequestBody WarehouseSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            int moved = warehouseService.updateWarehouse(id, payload, employeeId(user));
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("moved", moved);
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
