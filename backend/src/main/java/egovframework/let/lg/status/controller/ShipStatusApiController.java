package egovframework.let.lg.status.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.lg.status.service.ShipStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 물류관리 > 출하현황 컨트롤러 클래스 (송연 /api/lg/lg0003 를 S_ERP 규칙으로 옮김. 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/lg/ship-status")
@Tag(name = "ShipStatusApiController", description = "물류관리 - 출하현황")
public class ShipStatusApiController {

    private static final String TAG = "ShipStatusApiController";

    private final ResultVoHelper resultVoHelper;
    private final ShipStatusService shipStatusService;

    @Operation(summary = "출하확정된 기록(기간·품목명·거래처명)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO listStatus(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "productName", required = false) String productName,
            @RequestParam(name = "clientName", required = false) String clientName) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", shipStatusService.listStatus(start, end, productName, clientName));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
