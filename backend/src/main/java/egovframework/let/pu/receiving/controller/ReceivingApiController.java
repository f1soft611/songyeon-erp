package egovframework.let.pu.receiving.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pu.receiving.domain.model.ReceivingBulkRequestVO;
import egovframework.let.pu.receiving.service.ReceivingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매관리 > 입고관리 컨트롤러 클래스 (송연 /api/materials/receiving · last-price · receiving-status 를 S_ERP 규칙으로 옮김).
 * 서류는 공통 첨부(/api/v1/co/attachments, scope=receiving), 발주 가져오기는 발주관리(/api/v1/pu/purchase-orders)를 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pu/receivings")
@Tag(name = "ReceivingApiController", description = "구매관리 - 입고관리")
public class ReceivingApiController {

    private static final String TAG = "ReceivingApiController";

    private final ResultVoHelper resultVoHelper;
    private final ReceivingService receivingService;

    @Operation(summary = "입고·반품 목록(날짜·기간·거래처·원재료명·kind)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO list(@RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "clientQ", required = false) String clientQ,
            @RequestParam(name = "materialQ", required = false) String materialQ,
            @RequestParam(name = "kind", required = false) String kind) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", receivingService.listReceivings(date, start, end, clientQ, materialQ, kind));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "입고·반품 여러 건 등록 {registered, rows, keys}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/bulk")
    public ResultVO registerBulk(@RequestBody ReceivingBulkRequestVO request) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", receivingService.registerBulk(request));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "입고·반품 취소(재고 되돌림, 붙은 서류도 지움)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/{id}")
    public ResultVO cancel(@PathVariable("id") long id) throws Exception {
        try {
            receivingService.cancel(id);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "마지막 입고 단가 {unitPrice, source}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/last-price")
    public ResultVO lastPrice(@RequestParam(name = "materialCode", required = false) String materialCode,
            @RequestParam(name = "clientName", required = false) String clientName) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", receivingService.lastPrice(materialCode, clientName));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "서류등록 탭: 기간 안 원재료별 입고량", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/summary")
    public ResultVO summary(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "clientQ", required = false) String clientQ,
            @RequestParam(name = "materialQ", required = false) String materialQ) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", receivingService.summary(start, end, clientQ, materialQ));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "서류등록 탭 상세보기 {rows, totalReceived, totalUsed}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/summary/detail")
    public ResultVO detail(@RequestParam(name = "materialCode", required = false) String materialCode,
            @RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "clientQ", required = false) String clientQ) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", receivingService.detail(materialCode, start, end, clientQ));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO failed(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
