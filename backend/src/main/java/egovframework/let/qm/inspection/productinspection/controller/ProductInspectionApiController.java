package egovframework.let.qm.inspection.productinspection.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.qm.inspection.productinspection.service.ProductInspectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 품질관리 > 품질검사 > 제품검사 컨트롤러 클래스 (송연 qdocs.py). 2026-11-06 제품별 기준 탭 · 검사 탭 조회만
 * @author SONGYEON ERP
 * @since 2026.11.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/qm/inspection/product-inspection")
@Tag(name = "ProductInspectionApiController", description = "품질관리 - 제품검사")
public class ProductInspectionApiController {

    private static final String TAG = "ProductInspectionApiController";

    private final ResultVoHelper resultVoHelper;
    private final ProductInspectionService productInspectionService;

    @Operation(summary = "제품별 기준 목록(?q=&only=유형있음|유형없음|규격있음|규격없음) → resultList · stats", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/product-specs")
    public ResultVO productSpecs(@RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "only", required = false) String only) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        try {
            resultMap.put("resultList", productInspectionService.listProductSpecs(q, only));
            resultMap.put("stats", productInspectionService.specStats());
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "검사 탭 로트(?start=&end=&dateBy=made|ship&planned=true) → resultList", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/lots")
    public ResultVO lots(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "dateBy", required = false) String dateBy,
            @RequestParam(name = "planned", required = false, defaultValue = "false") boolean planned) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        try {
            resultMap.put("resultList", productInspectionService.listLots(start, end, dateBy, planned));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
