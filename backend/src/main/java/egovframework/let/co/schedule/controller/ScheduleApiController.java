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
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 생산스케줄·물류스케줄 컨트롤러 클래스
 * (송연 /api/cm/cm0002 · /api/cm/cm0003 을 S_ERP 규칙으로 옮김. 보기 전용)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/schedules")
@Tag(name = "ScheduleApiController", description = "공통관리 - 생산스케줄·물류스케줄")
public class ScheduleApiController {

    private static final String TAG = "ScheduleApiController";

    private final ResultVoHelper resultVoHelper;
    private final ScheduleService scheduleService;

    @Operation(summary = "생산스케줄(그 날짜)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/production")
    public ResultVO listProductionSchedule(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            return list(scheduleService.listProductionSchedule(date));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "물류스케줄(그 날짜: 출하등록 줄 + 생산연동 줄)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/logistics")
    public ResultVO listLogisticsSchedule(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            return list(scheduleService.listLogisticsSchedule(date));
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
