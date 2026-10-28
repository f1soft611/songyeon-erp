package egovframework.let.pd.actual.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pd.actual.service.ProductionActualService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 생산관리 > 생산입고 컨트롤러 클래스
 * (송연 /api/pd/pd0002 를 S_ERP 규칙으로 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pd/production-actual")
@Tag(name = "ProductionActualApiController", description = "생산관리 - 생산입고")
public class ProductionActualApiController {

    private static final String TAG = "ProductionActualApiController";

    private final ResultVoHelper resultVoHelper;
    private final ProductionActualService productionActualService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 2026-10-26 제품 재고 원장(product_stock_movement)의 '누가' 는 로그인한 사원의 사번
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "그 날짜에 확정된 생산건", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listSchedule(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", productionActualService.listSchedule(date));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    // 숫자로 보내는 곳도 있어 글자로 받는다(송연 str() 처리와 같음). 빈 값이면 입고취소.
    @Operation(summary = "실생산량 저장(제품 재고·원장·필름/파우치가 함께 움직임, 비우면 입고취소)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PutMapping("/{id}/actual-qty")
    public ResultVO saveActualQty(@PathVariable long id, @RequestBody Map<String, Object> body,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            Object value = body == null ? null : body.get("actualQty");
            productionActualService.saveActualQty(id, value == null ? "" : value.toString(), employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
