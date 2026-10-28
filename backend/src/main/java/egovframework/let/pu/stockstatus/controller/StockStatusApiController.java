package egovframework.let.pu.stockstatus.controller;

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
import egovframework.let.pu.stockstatus.service.StockStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매관리 > 재고현황 컨트롤러 클래스 (송연 /api/materials/stock-as-of · /api/materials/{code}/lots 를 S_ERP 규칙으로 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pu/stock-status")
@Tag(name = "StockStatusApiController", description = "구매관리 - 재고현황")
public class StockStatusApiController {

    private static final String TAG = "StockStatusApiController";

    private final ResultVoHelper resultVoHelper;
    private final StockStatusService stockStatusService;

    @Operation(summary = "기준일 재고 {date, materials[…warehouseStock], totalAmount, warehouses}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO stockAsOf(@RequestParam(name = "date", required = false) String date) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", stockStatusService.stockAsOf(date));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "기준일까지 들어온 원재료 입고 로트", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/materials/{code}/lots")
    public ResultVO lots(@PathVariable("code") String code, @RequestParam(name = "date", required = false) String date) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", stockStatusService.listLots(code, date));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
