package egovframework.let.sa.order.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sa.order.domain.model.SalesOrderVO;
import egovframework.let.sa.order.service.SalesOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 영업관리 > 수주등록 컨트롤러 클래스
 * (송연 /api/sa/sa0004 를 S_ERP 규칙으로 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sa/orders")
@Tag(name = "SalesOrderApiController", description = "영업관리 - 수주등록")
public class SalesOrderApiController {

    private static final String TAG = "SalesOrderApiController";

    private final ResultVoHelper resultVoHelper;
    private final SalesOrderService salesOrderService;

    @Operation(summary = "수주일의 수주 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listOrders(@RequestParam(name = "date", required = false) String date) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", salesOrderService.listOrders(date));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "수주 거래처 후보(분류에 매출)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/clients")
    public ResultVO listClients() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", salesOrderService.listSalesClientNames());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "수주 품목 후보(사용 중인 제품)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/products")
    public ResultVO listProducts() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", salesOrderService.listProductCandidates());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "수주 추가", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공. result.id") })
    @PostMapping
    public ResultVO createOrder(@RequestBody SalesOrderVO request) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("id", salesOrderService.createOrder(request));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "수주 수정(수주일·순서는 그대로)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PutMapping("/{id}")
    public ResultVO updateOrder(@PathVariable long id, @RequestBody SalesOrderVO request) throws Exception {
        try {
            salesOrderService.updateOrder(id, request);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "수주 삭제", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "삭제 성공") })
    @DeleteMapping("/{id}")
    public ResultVO deleteOrder(@PathVariable long id) throws Exception {
        try {
            salesOrderService.deleteOrder(id);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "삭제되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex); // 2026-10-23 가져간 수주 · 없는 수주
        }
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
