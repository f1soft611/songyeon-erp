package egovframework.let.pu.order.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pu.order.domain.model.PurchaseOrderBulkRequestVO;
import egovframework.let.pu.order.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매관리 > 발주관리 컨트롤러 클래스 (송연 /api/materials/purchase-order 를 S_ERP 규칙으로 옮김).
 * 매입 거래처·원재료 후보는 기초정보(/api/v1/co/basic-info/material-master/vendors · /materials)를 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pu/purchase-orders")
@Tag(name = "PurchaseOrderApiController", description = "구매관리 - 발주관리")
public class PurchaseOrderApiController {

    private static final String TAG = "PurchaseOrderApiController";

    private final ResultVoHelper resultVoHelper;
    private final PurchaseOrderService purchaseOrderService;

    @Operation(summary = "발주 목록(발주일·기간·거래처·원재료명·입고여부)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO listOrders(@RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "clientQ", required = false) String clientQ,
            @RequestParam(name = "materialQ", required = false) String materialQ,
            @RequestParam(name = "received", required = false) String received) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", purchaseOrderService.listOrders(date, start, end, clientQ, materialQ, received));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "발주 여러 건 등록 {registered}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/bulk")
    public ResultVO registerBulk(@RequestBody PurchaseOrderBulkRequestVO request) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("registered", purchaseOrderService.registerBulk(request));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "발주 취소(입고된 발주는 막는다)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/{id}")
    public ResultVO cancel(@PathVariable("id") long id) throws Exception {
        try {
            purchaseOrderService.cancel(id);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO failed(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
