package egovframework.let.pd.confirm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pd.confirm.domain.model.ProductionSaveRequestVO;
import egovframework.let.pd.confirm.domain.model.ProductionScheduleVO;
import egovframework.let.pd.confirm.service.ProductionConfirmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 생산관리 > 생산확정 컨트롤러 클래스
 * (송연 /api/pd/pd0001 를 S_ERP 규칙으로 옮김. 거래처·품목 후보는 수주등록 API 를 같이 쓴다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pd/production-confirm")
@Tag(name = "ProductionConfirmApiController", description = "생산관리 - 생산확정")
public class ProductionConfirmApiController {

    private static final String TAG = "ProductionConfirmApiController";

    private final ResultVoHelper resultVoHelper;
    private final ProductionConfirmService productionConfirmService;

    @Operation(summary = "그 날짜의 확정된 생산건", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listSchedule(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            return list(productionConfirmService.listSchedule(date));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "생산확정(로트번호 발번 + 원재료 차감 + 수주 가져감)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "확정 성공. result.id·result.lotNo") })
    @PostMapping
    public ResultVO create(@RequestBody ProductionSaveRequestVO request) throws Exception {
        try {
            ProductionScheduleVO saved = productionConfirmService.create(request);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("id", saved.getId());
            resultMap.put("lotNo", saved.getLotNo());
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "확정되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "생산확정 수정(원재료 되돌린 뒤 다시 차감)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PutMapping("/{id}")
    public ResultVO update(@PathVariable long id, @RequestBody ProductionSaveRequestVO request) throws Exception {
        try {
            productionConfirmService.update(id, request);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "생산확정 삭제(원재료 되돌림, 수주 다시 가져올 수 있게)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "삭제 성공") })
    @DeleteMapping("/{id}")
    public ResultVO delete(@PathVariable long id) throws Exception {
        try {
            productionConfirmService.delete(id);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "삭제되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "현장 투입지시서", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공. result.item(header·rows)") })
    @GetMapping("/{id}/batch-sheet")
    public ResultVO batchSheet(@PathVariable long id) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", productionConfirmService.batchSheet(id));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "수주등록 가져오기 목록(생산예정일 기간, 아직 생산으로 안 가져간 수주)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/import-orders")
    public ResultVO importOrders(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end) throws Exception {
        return list(productionConfirmService.listImportOrders(start, end));
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
