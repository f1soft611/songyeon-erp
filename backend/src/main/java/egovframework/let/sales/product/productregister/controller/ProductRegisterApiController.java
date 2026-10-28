package egovframework.let.sales.product.productregister.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.product.productregister.domain.model.ProductRegisterRequestVO;
import egovframework.let.sales.product.productregister.domain.model.ProductRegisterVO;
import egovframework.let.sales.product.productregister.service.ProductRegisterService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 영업관리 > 제품등록 컨트롤러 클래스
 * (송연 /api/sa/sa0001 를 S_ERP 규칙으로 옮김. 원재료·거래처·포장유형 목록과 원재료명 확인은 기초정보 API 를 같이 쓴다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/product/product-register")
@Tag(name = "ProductRegisterApiController", description = "영업관리 - 제품등록")
public class ProductRegisterApiController {

    // 같은 때 둘이 저장해 같은 제품코드가 나오면 그 저장은 통째로 취소되고 다음 번호로 다시 한다(송연과 같음)
    private static final int CODE_ATTEMPTS = 3;
    static final String CODE_RACE_MESSAGE = "제품코드를 정하지 못했어요. 잠시 후 다시 등록해주세요.";

    private final ResultVoHelper resultVoHelper;
    private final ProductRegisterService productRegisterService;
    /** 로그인 사원 사번(등록자, 2026-10-23) */
    private final LoginEmployeeResolver loginEmployeeResolver;

    @Operation(summary = "제품 등록(제품코드 발번 + 배합비 + 단가표)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "ProductRegisterApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "등록 성공. result.productCode·result.materialCost") })
    @PostMapping
    public ResultVO registerProduct(@RequestBody ProductRegisterRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        ProductRegisterRequestVO request = payload == null ? new ProductRegisterRequestVO() : payload;
        request.setRegUserId(loginEmployeeResolver.employeeId(user));
        for (int attempt = 1; ; attempt++) {
            try {
                // 서비스 한 번 = 트랜잭션 한 번이라, 다시 할 때는 새 트랜잭션에서 다음 번호로 한다
                ProductRegisterVO saved = productRegisterService.registerProduct(request);
                Map<String, Object> resultMap = new HashMap<>();
                resultMap.put("productCode", saved.getProductCode());
                resultMap.put("materialCost", saved.getMaterialCost());
                return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "등록되었습니다");
            } catch (IllegalArgumentException ex) {
                return inputError(ex.getMessage());
            } catch (DuplicateKeyException ex) {
                if (attempt >= CODE_ATTEMPTS) {
                    return inputError(CODE_RACE_MESSAGE);
                }
            }
        }
    }

    @Operation(summary = "방금 등록한 제품 삭제(제품 · 배합비 · 단가표, 2026-10-28)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "ProductRegisterApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "삭제 성공. 재고 · 사용 이력이 있으면 입력 오류") })
    @DeleteMapping("/{code}")
    public ResultVO deleteProduct(@PathVariable("code") String code) throws Exception {
        try {
            productRegisterService.deleteProduct(code);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "삭제되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex.getMessage());
        }
    }

    private ResultVO inputError(String message) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, message);
    }
}
