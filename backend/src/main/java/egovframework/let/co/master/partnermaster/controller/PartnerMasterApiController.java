package egovframework.let.co.master.partnermaster.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.partnermaster.domain.model.PartnerMasterVO;
import egovframework.let.co.master.partnermaster.service.PartnerMasterService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 기초정보 > 거래처BOM 컨트롤러 클래스
 * (송연 /api/cm/cm0001/client-master 를 S_ERP 규칙으로 옮김. 송연에는 권한 개념이 없어 로그인 사용자 모두 사용)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/partner-master")
@Tag(name = "PartnerMasterApiController", description = "기초정보 - 거래처마스터")
public class PartnerMasterApiController {

    private final ResultVoHelper resultVoHelper;
    private final PartnerMasterService partnerMasterService;
    /** 로그인 사원 사번(등록자 · 수정자, 2026-10-23) */
    private final LoginEmployeeResolver loginEmployeeResolver;

    @Operation(summary = "거래처 목록 조회", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PartnerMasterApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listClients() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", partnerMasterService.listClients());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "거래처 등록", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PartnerMasterApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "등록 성공") })
    @PostMapping
    public ResultVO createClient(@RequestBody PartnerMasterVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            PartnerMasterVO request = payload == null ? new PartnerMasterVO() : payload;
            request.setRegUserId(loginEmployeeResolver.employeeId(user));
            partnerMasterService.createClient(request);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "거래처 수정", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PartnerMasterApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "수정 성공") })
    @PutMapping("/{id}")
    public ResultVO updateClient(@PathVariable Long id, @RequestBody PartnerMasterVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            PartnerMasterVO request = payload == null ? new PartnerMasterVO() : payload;
            request.setUpdUserId(loginEmployeeResolver.employeeId(user));
            partnerMasterService.updateClient(id, request);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "거래처 분류(공통코드 CUSTOMER_CATEGORY 사용 중 항목) [{code, name}]", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PartnerMasterApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/client-types")
    public ResultVO listClientTypes() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", partnerMasterService.listClientTypes());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
