package egovframework.let.pd.label.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pd.label.service.LabelPrintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 생산관리 > 라벨출력 컨트롤러 클래스
 * (송연 /api/pd/pd0004 를 S_ERP 규칙으로 옮김. 라벨 한 장을 그리는 데 쓰는 버전·양식·회사정보는 공용 /api/v1/qm/label 에 있다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pd/label-print")
@Tag(name = "LabelPrintApiController", description = "생산관리 - 라벨출력")
public class LabelPrintApiController {

    private static final String TAG = "LabelPrintApiController";

    private final ResultVoHelper resultVoHelper;
    private final LabelPrintService labelPrintService;

    @Operation(summary = "그 날짜에 생산확정된 품목", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listByDate(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", labelPrintService.listByDate(date));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
