package egovframework.let.lg.confirm.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.lg.confirm.domain.model.ShipConfirmRequestVO;
import egovframework.let.lg.confirm.service.ShipConfirmService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 물류관리 > 출하확정 컨트롤러 클래스 (송연 /api/lg/lg0002 를 S_ERP 규칙으로 옮김).
 * {source} 는 manual(출하등록에서 넣은 줄) 또는 production(물류출고일이 적힌 생산확정 줄).
 * 포장방법 · 배차(차량) 목록은 화면이 공통코드(PACKING_TYPE · VEHICLE) 상세코드에서 받는다(2026-10-19, 예전엔 기초정보 API).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/lg/ship-confirm")
@Tag(name = "ShipConfirmApiController", description = "물류관리 - 출하확정")
public class ShipConfirmApiController {

    private static final String TAG = "ShipConfirmApiController";

    private final ResultVoHelper resultVoHelper;
    private final ShipConfirmService shipConfirmService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 2026-10-26 제품 재고 원장(product_stock_movement)의 '누가' 는 로그인한 사원의 사번
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "그 날짜의 출하 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO listSchedule(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", shipConfirmService.listSchedule(date));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "운행자 자동완성(사원 이름)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/drivers")
    public ResultVO drivers() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", shipConfirmService.listDriverNames());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "출하확정(실출하량만큼 재고가 빠진다)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/{source}/{id}/confirm")
    public ResultVO confirm(@PathVariable("source") String source, @PathVariable("id") long id,
            @RequestBody ShipConfirmRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            shipConfirmService.confirm(source, id, request, employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "확정취소(뺐던 재고를 되돌린다)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/{source}/{id}/unconfirm")
    public ResultVO unconfirm(@PathVariable("source") String source, @PathVariable("id") long id,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            shipConfirmService.unconfirm(source, id, employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "용차 금액 확인(기간 안 확정된 출하의 용차 내역과 합계)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/charter-summary")
    public ResultVO charterSummary(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", shipConfirmService.charterSummary(start, end));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO failed(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
