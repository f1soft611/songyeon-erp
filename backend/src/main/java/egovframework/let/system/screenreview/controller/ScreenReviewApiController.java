package egovframework.let.system.screenreview.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.screenreview.domain.model.ScreenReviewSaveVO;
import egovframework.let.system.screenreview.service.ScreenReviewService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 화면검수 컨트롤러 클래스 (화면마다 맨 오른쪽 [화면검수] → 오른쪽 패널)
 * 화면은 화면ID(tb_menu.menu_code)로 찾는다. 첨부는 공통 파일 API(/api/v1/common/files)로 올린다:
 * 저장 뒤 SCREEN_REVIEW + historyId, 임시저장 뒤 SCREEN_REVIEW_DRAFT + draftId.
 * 지금은 로그인 사용자 모두 쓴다(업체 · 개발사 역할 구분은 아직 없다).
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system/screen-reviews")
@Tag(name = "ScreenReviewApiController", description = "시스템 - 화면검수")
public class ScreenReviewApiController {

    private final ResultVoHelper resultVoHelper;
    private final ScreenReviewService screenReviewService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 검수자 · 작성자는 사번(employees.id). 로그인 uniqId 가 사번이다(2026-11-03).
    // 사번을 못 찾으면 null 을 넘기고 서비스가 저장을 막는다
    private String empId(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "화면검수 관리 목록(사용 중인 화면마다 표시 상태 · 개발담당 · 마지막 검수일 · 마지막 의견)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "ScreenReviewApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO getSummaryList(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("items", screenReviewService.getSummaryList(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "화면검수 조회(현황 · 이력 · 내 임시저장, 첨부 포함)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "ScreenReviewApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/{menuCode}")
    public ResultVO getDetail(@PathVariable("menuCode") String menuCode, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        String empId = empId(user);
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", screenReviewService.getDetail(user.getTenantId(), menuCode, empId));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "화면검수 임시저장(의견만, 상태는 바꾸지 않는다). 돌려준 draftId 로 첨부를 올린다", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "ScreenReviewApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "임시저장 성공") })
    @PutMapping("/{menuCode}/draft")
    public ResultVO saveDraft(@PathVariable("menuCode") String menuCode, @RequestBody ScreenReviewSaveVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        String empId = empId(user);
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("draftId", screenReviewService.saveDraft(user.getTenantId(), menuCode, empId, payload));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "임시저장했습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "화면검수 저장(상태 변경 + 이력). 돌려준 historyId 로 첨부를 올린다", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "ScreenReviewApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PostMapping("/{menuCode}")
    public ResultVO save(@PathVariable("menuCode") String menuCode, @RequestBody ScreenReviewSaveVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        String empId = empId(user);
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("historyId", screenReviewService.save(user.getTenantId(), menuCode, empId, payload));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
