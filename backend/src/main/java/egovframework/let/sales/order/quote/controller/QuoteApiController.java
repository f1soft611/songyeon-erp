package egovframework.let.sa.quote.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sa.quote.domain.model.QuoteSaveRequestVO;
import egovframework.let.sa.quote.domain.model.QuoteVO;
import egovframework.let.sa.quote.service.QuoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 영업관리 > 견적 컨트롤러 클래스
 * (송연 /api/sa/sa0003 를 S_ERP 규칙으로 옮김. 포장유형·거래처·원재료 목록은 기초정보 API 를 같이 쓴다.
 *  견적 확정은 제품등록 API 에 견적 번호를 실어 보내면 함께 처리된다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sa/quotes")
@Tag(name = "QuoteApiController", description = "영업관리 - 견적")
public class QuoteApiController {

    private static final String TAG = "QuoteApiController";

    private final ResultVoHelper resultVoHelper;
    private final QuoteService quoteService;

    @Operation(summary = "견적 목록(최근 것부터)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listQuotes() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", quoteService.listQuotes());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "견적 상세(배합비 포함)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공. result.item") })
    @GetMapping("/{quoteId}")
    public ResultVO getQuote(@PathVariable long quoteId) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", quoteService.getQuote(quoteId));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "가견적 작성", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공. result.quoteId·result.totalPrice") })
    @PostMapping
    public ResultVO createQuote(@RequestBody QuoteSaveRequestVO request) throws Exception {
        try {
            return saved(quoteService.createQuote(request));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "가견적 수정", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공. result.totalPrice") })
    @PutMapping("/{quoteId}")
    public ResultVO updateQuote(@PathVariable long quoteId, @RequestBody QuoteSaveRequestVO request) throws Exception {
        try {
            return saved(quoteService.updateQuote(quoteId, request));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "가견적 삭제", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "삭제 성공") })
    @DeleteMapping("/{quoteId}")
    public ResultVO deleteQuote(@PathVariable long quoteId) throws Exception {
        quoteService.deleteQuote(quoteId);
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "삭제되었습니다");
    }

    private ResultVO saved(QuoteVO quote) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("quoteId", quote.getQuoteId());
        resultMap.put("totalPrice", quote.getTotalPrice());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
