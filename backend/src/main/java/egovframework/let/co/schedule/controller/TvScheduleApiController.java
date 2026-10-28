package egovframework.let.co.schedule.controller;

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
import egovframework.let.co.schedule.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 현장 TV 화면 조회 컨트롤러 클래스 (송연 TvController: /tv/production · /tv/logistics 가 쓰는 조회)
 * 작업장 TV 에는 로그인할 사람이 없어 로그인 없이 열린다(SecurityConfig AUTH_GET_WHITELIST, GET 만).
 * 공개이므로 TV 에 보이는 칸(거래처·품목명·수량·비고)만 내려준다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/tv")
@Tag(name = "TvScheduleApiController", description = "현장 TV - 생산스케줄·물류스케줄(로그인 없이)")
public class TvScheduleApiController {

    private static final String TAG = "TvScheduleApiController";

    private final ResultVoHelper resultVoHelper;
    private final ScheduleService scheduleService;

    @Operation(summary = "현장 TV 생산스케줄(로그인 없이)", tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/production")
    public ResultVO production(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            return list(scheduleService.listProductionScheduleForTv(date));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "현장 TV 물류스케줄(로그인 없이)", tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/logistics")
    public ResultVO logistics(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            return list(scheduleService.listLogisticsScheduleForTv(date));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    private ResultVO list(List<?> rows) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", rows);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
