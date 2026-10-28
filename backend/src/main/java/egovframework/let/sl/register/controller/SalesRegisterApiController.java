package egovframework.let.sl.register.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sl.register.domain.model.SalesPullRequestVO;
import egovframework.let.sl.register.domain.model.SalesRecordVO;
import egovframework.let.sl.register.service.SalesRegisterService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 판매관리 > 판매등록 컨트롤러 클래스 (송연 sales.py /api/sales/shippable · /api/sales/pull · POST /api/sales 를 S_ERP 규칙으로 옮김).
 * 거래처·품목 후보는 기초정보(/api/v1/co/basic-info/clients)·수주등록(/api/v1/sa/orders/products)의 목록을 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sl/sales-register")
@Tag(name = "SalesRegisterApiController", description = "판매관리 - 판매등록")
public class SalesRegisterApiController {

    private static final String TAG = "SalesRegisterApiController";

    private final ResultVoHelper resultVoHelper;
    private final SalesRegisterService salesRegisterService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 2026-10-26 등록자(created_by)는 로그인한 사원의 사번
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "판매로 끌어올 출하확정 건 {rows, pendingCount}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/shippable")
    public ResultVO shippable(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "clientName", required = false) String clientName) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", salesRegisterService.listShippable(start, end, clientName));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "선택 항목 판매등록 {added, skipped}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/pull")
    public ResultVO pull(@RequestBody SalesPullRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", salesRegisterService.pull(request, employeeId(user)));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "판매 직접 등록(출하 없이 판 것)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/manual")
    public ResultVO manual(@RequestBody SalesRecordVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            salesRegisterService.createManual(request, employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO failed(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
