package egovframework.let.ha.accsales.controller;

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
import egovframework.let.ha.accsales.service.AccSalesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 인사·회계 > 매출·매입관리 컨트롤러 클래스 (송연 /api/accounting/trade-report 를 S_ERP 규칙으로 옮김. 조회만 한다)
 * 조회 창의 고를 거리(송연 /api/accounting/clients · /api/accounting/products · /api/clients/vendor-names · /api/materials/names)는 /options 하나로 묶었다.
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ha/acc-sales")
@Tag(name = "AccSalesApiController", description = "인사·회계 - 매출·매입관리")
public class AccSalesApiController {

    private static final String TAG = "AccSalesApiController";

    private final ResultVoHelper resultVoHelper;
    private final AccSalesService accSalesService;

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

    @Operation(summary = "매출 · 매입 조회 ?kind=매출·매입 &start &end(필수) &view=summary·detail·yoy &unit=day·month·year &client=… &item=…(여럿, 비우면 전체)",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/trade-report")
    public ResultVO tradeReport(@RequestParam Map<String, String> filter,
            @RequestParam(value = "client", required = false) List<String> clients,
            @RequestParam(value = "item", required = false) List<String> items) throws Exception {
        return handle(map -> map.put("item", accSalesService.tradeReport(filter, clients, items)));
    }

    @Operation(summary = "조회 창에서 고를 거래처 · 품목 ?kind=매출·매입 → {clients, items}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/options")
    public ResultVO options(@RequestParam(value = "kind", required = false) String kind) throws Exception {
        return handle(map -> map.put("item", accSalesService.options(kind)));
    }
}
