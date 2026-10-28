package egovframework.let.pu.substitution.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import egovframework.let.pu.substitution.domain.model.SubstitutionRequestVO;
import egovframework.let.pu.substitution.service.MaterialSubstitutionService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매관리 > 재료 치환등록 컨트롤러 클래스 (송연 /api/material-substitution · /api/production-schedule/{id}/materials ·
 * /api/production-schedule/{id}/substitute 를 S_ERP 규칙으로 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pu/material-substitution")
@Tag(name = "MaterialSubstitutionApiController", description = "구매관리 - 재료 치환등록")
public class MaterialSubstitutionApiController {

    private static final String TAG = "MaterialSubstitutionApiController";

    private final ResultVoHelper resultVoHelper;
    private final MaterialSubstitutionService materialSubstitutionService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 2026-10-26 '누가' 는 로그인한 사원의 사번
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "그날 생산확정된 건 목록(바꿔 쓰는 원재료 수 포함)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO list(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("resultList", materialSubstitutionService.listSchedules(date));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "대신 쓸 원재료 후보(코드 · 이름 · 재고)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/materials")
    public ResultVO materials() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", materialSubstitutionService.listMaterials());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "상세보기: 생산건 하나의 원재료 줄 {header, rows}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/{scheduleId}")
    public ResultVO detail(@PathVariable("scheduleId") long scheduleId) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", materialSubstitutionService.detail(scheduleId));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "바꿔 쓰기(원재료 차감 다시 계산) → {header, rows}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/{scheduleId}")
    public ResultVO substitute(@PathVariable("scheduleId") long scheduleId, @RequestBody SubstitutionRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", materialSubstitutionService.substitute(scheduleId, request, employeeId(user)));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    @Operation(summary = "되돌리기(원래 배합표대로 다시 계산) → {header, rows}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/{scheduleId}/{subId}")
    public ResultVO undo(@PathVariable("scheduleId") long scheduleId, @PathVariable("subId") long subId) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", materialSubstitutionService.undo(scheduleId, subId));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO failed(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
