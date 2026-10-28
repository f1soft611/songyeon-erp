package egovframework.let.sl.status.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sl.status.service.SalesStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 판매관리 > 토탈집계 컨트롤러 클래스 (송연 GET /api/sales/total 을 S_ERP 규칙으로 옮김. 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sl/sales-total")
@Tag(name = "SalesTotalApiController", description = "판매관리 - 토탈집계")
public class SalesTotalApiController {

    private static final String TAG = "SalesTotalApiController";

    private final ResultVoHelper resultVoHelper;
    private final SalesStatusService salesStatusService;

    @Operation(summary = "생산입고와 판매를 한 표에(기간·거래처·품목명)와 합계", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO total(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "clientName", required = false) String clientName,
            @RequestParam(name = "productName", required = false) String productName) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", salesStatusService.total(start, end, clientName, productName));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
