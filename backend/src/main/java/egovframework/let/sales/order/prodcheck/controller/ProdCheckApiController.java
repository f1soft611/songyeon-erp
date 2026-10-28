package egovframework.let.sales.order.prodcheck.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckRequestVO;
import egovframework.let.sales.order.prodcheck.service.ProdCheckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 영업관리 > 생산가능확인 컨트롤러 클래스
 * (송연 /api/sa/sa0006 를 S_ERP 규칙으로 옮김. 조회만 한다.
 *  확인은 제품·수량 짝을 여러 개 보내야 해서 쿼리 대신 본문으로 받는다 — 쉼표가 든 수량('1,000')도 그대로 온다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/order/prod-check")
@Tag(name = "ProdCheckApiController", description = "영업관리 - 생산가능확인")
public class ProdCheckApiController {

    private static final String TAG = "ProdCheckApiController";

    private final ResultVoHelper resultVoHelper;
    private final ProdCheckService prodCheckService;

    @Operation(summary = "고를 수 있는 제품(배합비가 있는 사용 중 제품)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/products")
    public ResultVO listProducts() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", prodCheckService.listProducts());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "생산가능 확인(조회만)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "확인 성공. result.item") })
    @PostMapping("/check")
    public ResultVO check(@RequestBody ProdCheckRequestVO request) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", prodCheckService.check(request));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
