package egovframework.let.lg.stock.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.lg.stock.service.ProductStockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 물류관리 > 제품재고관리 컨트롤러 클래스 (송연 /api/lg/lg0001 을 S_ERP 규칙으로 옮김. 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/lg/product-stock")
@Tag(name = "ProductStockApiController", description = "물류관리 - 제품재고관리")
public class ProductStockApiController {

    private static final String TAG = "ProductStockApiController";

    private final ResultVoHelper resultVoHelper;
    private final ProductStockService productStockService;

    @Operation(summary = "제품 현재고·생산예정 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO listStock(@RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "clientName", required = false) String clientName,
            @RequestParam(name = "sort", defaultValue = "name-asc") String sort) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", productStockService.listStock(q, clientName, sort));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "날짜 기준 제품재고·재고금액(원재료비 기준). 날짜를 비우면 오늘", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/as-of")
    public ResultVO stockAsOf(@RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "clientName", required = false) String clientName) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", productStockService.stockAsOf(date, clientName));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "제품의 로트(생산량·출하량·잔량)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/products/{code}/lots")
    public ResultVO lots(@PathVariable("code") String code) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", productStockService.listLots(code));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
