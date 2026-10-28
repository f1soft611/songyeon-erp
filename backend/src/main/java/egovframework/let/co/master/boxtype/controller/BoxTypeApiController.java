package egovframework.let.co.master.boxtype.controller;

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
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.boxtype.domain.model.BoxTypeVO;
import egovframework.let.co.master.boxtype.service.BoxTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 기초정보 > 포장유형 컨트롤러 클래스 (2026.10.19 tb_box_type 으로 변경: 저장은 boxTypeId 로 등록/수정, 삭제는 논리삭제)
 * (송연 /api/cm/cm0001/product-types 를 S_ERP 규칙으로 옮김. 송연에는 권한 개념이 없어 로그인 사용자 모두 사용)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/box-type")
@Tag(name = "BoxTypeApiController", description = "기준정보 - 포장유형")
public class BoxTypeApiController {

    private final ResultVoHelper resultVoHelper;
    private final BoxTypeService boxTypeService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 로그인한 사원의 사번(employees.id). 2026-10-22 부터 로그인 uniqId 는 tb_user 번호라 도우미로 사번을 찾는다
    // 등록자 · 수정자에 그대로 넣는다
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "포장유형 목록 조회(기본은 사용 중만, includeUnused=true 면 사용안함도)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "BoxTypeApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listBoxTypes(@RequestParam(value = "includeUnused", required = false, defaultValue = "false") boolean includeUnused) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", boxTypeService.listBoxTypes(includeUnused));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "포장유형 저장(boxTypeId 없으면 등록, 있으면 그 줄 수정)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "BoxTypeApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PostMapping
    public ResultVO saveBoxType(@RequestBody BoxTypeVO payload, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            boxTypeService.saveBoxType(payload, employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "포장유형 삭제(물리 삭제)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "BoxTypeApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "삭제 성공") })
    @DeleteMapping("/{boxTypeId}")
    public ResultVO deleteBoxType(@PathVariable("boxTypeId") Long boxTypeId, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            boxTypeService.deleteBoxType(boxTypeId, employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "삭제되었습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
