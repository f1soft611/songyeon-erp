package egovframework.let.sales.product.pricing.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.product.pricing.service.PricingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 영업관리 > 단가관리 컨트롤러 클래스
 * (송연 /api/sa/sa0002 를 S_ERP 규칙으로 옮김. 포장유형·거래처 목록은 기초정보 API 를 같이 쓴다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/product/pricing")
@Tag(name = "PricingApiController", description = "영업관리 - 단가관리")
public class PricingApiController {

    private static final String TAG = "PricingApiController";

    private final ResultVoHelper resultVoHelper;
    private final PricingService pricingService;

    @Operation(summary = "단가 목록(제품명·제품코드·거래처 검색)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listPricing(@RequestParam(name = "q", required = false) String q) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", pricingService.listPricing(q));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "단가상세(단가표 + 원재료 구성)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공. result.item·result.bomList") })
    @GetMapping("/{productCode}")
    public ResultVO getPricing(@PathVariable String productCode) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", pricingService.getPricing(productCode));
            resultMap.put("bomList", pricingService.listPricingBom(productCode));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "단가상세 저장(보낸 항목만, 제품단가 다시 계산)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PutMapping("/{productCode}")
    public ResultVO updatePricing(@PathVariable String productCode, @RequestBody Map<String, Object> body) throws Exception {
        try {
            pricingService.updatePricing(productCode, body);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
