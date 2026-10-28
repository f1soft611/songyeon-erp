package egovframework.let.ha.accledger.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.ha.accledger.service.AccLedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 인사·회계 > 거래처별관리대장 컨트롤러 클래스 (송연 /api/accounting/client-ledger 를 S_ERP 규칙으로 옮김. 조회만 한다)
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ha/acc-ledger")
@Tag(name = "AccLedgerApiController", description = "인사·회계 - 거래처별관리대장")
public class AccLedgerApiController {

    private static final String TAG = "AccLedgerApiController";

    private final ResultVoHelper resultVoHelper;
    private final AccLedgerService accLedgerService;

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

    @Operation(summary = "채권 · 채무 대장 ?kind=채권·채무 &start &end(필수) &client=…(한 곳 이상)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/client-ledger")
    public ResultVO clientLedger(@RequestParam Map<String, String> filter,
            @RequestParam(value = "client", required = false) List<String> clients) throws Exception {
        return handle(map -> map.put("item", accLedgerService.clientLedger(filter, clients)));
    }

    @Operation(summary = "조회 창에서 고를 거래처(거래처BOM 전체)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/clients")
    public ResultVO clients() throws Exception {
        return handle(map -> map.put("list", accLedgerService.clientNames()));
    }
}
