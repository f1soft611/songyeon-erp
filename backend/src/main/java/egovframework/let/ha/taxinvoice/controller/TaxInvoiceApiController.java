package egovframework.let.ha.taxinvoice.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.ha.taxinvoice.service.TaxInvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 인사·회계 > 세금계산서 컨트롤러 클래스 (송연 /api/tax-invoice/* · /api/accounting/sales-by-client 를 S_ERP 규칙으로 옮김)
 * 발행은 송연도 아직 없다. 요청하면 안내 문구만 돌려주고 아무것도 적지 않는다.
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ha/tax-invoice")
@Tag(name = "TaxInvoiceApiController", description = "인사·회계 - 세금계산서")
public class TaxInvoiceApiController {

    private static final String TAG = "TaxInvoiceApiController";

    private final ResultVoHelper resultVoHelper;
    private final TaxInvoiceService taxInvoiceService;

    private interface Work {
        void run(Map<String, Object> resultMap) throws Exception;
    }

    private ResultVO handle(Work work) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        try {
            work.run(resultMap);
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "발급업체(팝빌) 연결 여부 → {configured}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/status")
    public ResultVO status() throws Exception {
        return handle(map -> map.put("item", taxInvoiceService.status()));
    }

    @Operation(summary = "즉시 발행 내역 ?clientName(일부도 됨) &start &end → {rows, totalAmount, totalQty, resolvedClientName}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/single")
    public ResultVO single(@RequestParam Map<String, String> filter) throws Exception {
        return handle(map -> map.put("item", taxInvoiceService.single(filter)));
    }

    @Operation(summary = "월단위 일괄발행 거래처별 매출 ?start &end → {clients, totalAmount}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/batch")
    public ResultVO batch(@RequestParam Map<String, String> filter) throws Exception {
        return handle(map -> map.put("item", taxInvoiceService.batch(filter)));
    }

    @Operation(summary = "즉시 발행 {clientName, start, end} — 아직 발행하지 않고 안내만 돌려준다", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/issue-single")
    public ResultVO issueSingle(@RequestBody(required = false) Map<String, Object> body) throws Exception {
        return handle(map -> taxInvoiceService.issue());
    }

    @Operation(summary = "일괄 발행 {start, end, clientNames} — 아직 발행하지 않고 안내만 돌려준다", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/issue-batch")
    public ResultVO issueBatch(@RequestBody(required = false) Map<String, Object> body) throws Exception {
        return handle(map -> taxInvoiceService.issue());
    }
}
