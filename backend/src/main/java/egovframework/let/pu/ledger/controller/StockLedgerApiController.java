package egovframework.let.pu.ledger.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pu.ledger.service.StockLedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매관리 > 수불대장 컨트롤러 클래스 (송연 /api/purchase-stock-range · /api/materials/stock-as-of 를 S_ERP 규칙으로 옮김)
 * 발주 등록은 발주관리 API(/api/v1/pu/purchase-orders/bulk, source=ledger)를 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pu/stock-ledger")
@Tag(name = "StockLedgerApiController", description = "구매관리 - 수불대장")
public class StockLedgerApiController {

    private static final String TAG = "StockLedgerApiController";

    private final ResultVoHelper resultVoHelper;
    private final StockLedgerService stockLedgerService;

    @Operation(summary = "기간 수불(원재료·부자재 전부)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO ledger(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", stockLedgerService.ledger(start, end));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "기준일 원재료 재고·재고금액(날짜를 비우면 오늘)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/stock-as-of")
    public ResultVO stockAsOf(@RequestParam(name = "date", required = false) String date) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", stockLedgerService.stockAsOf(date));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
