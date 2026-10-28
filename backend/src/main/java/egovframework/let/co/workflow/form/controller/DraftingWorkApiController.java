package egovframework.let.co.workflow.form.controller;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.service.DraftingWorkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/workflow/forms")
@Tag(name = "DraftingWorkApiController", description = "기안양식 관리")
public class DraftingWorkApiController {

    private final ResultVoHelper resultVoHelper;
    private final DraftingWorkService draftingWorkService;

        @Operation(summary = "기안양식 목록 조회", security = { @SecurityRequirement(name = "Authorization") })
        @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 사용자")
        })
        @GetMapping
    public ResultVO listWorks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryItemId,
            @RequestParam(required = false) Long regTermId,
            @RequestParam(required = false) String useAt,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("resultList", draftingWorkService.listWorks(
                user.getTenantId(), keyword, categoryItemId, regTermId, useAt));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

        @Operation(summary = "기안양식 사용자 선택 목록 조회", security = { @SecurityRequirement(name = "Authorization") })
        @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 사용자")
        })
        @GetMapping("/users")
    public ResultVO listUserOptions(
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("resultList", draftingWorkService.listUserOptions(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

        @Operation(summary = "기안양식 등록", security = { @SecurityRequirement(name = "Authorization") })
        @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "등록 성공"),
            @ApiResponse(responseCode = "400", description = "입력값 오류 또는 양식 코드 중복"),
            @ApiResponse(responseCode = "403", description = "테넌트 관리자 권한 필요")
        })
        @PostMapping
    public ResponseEntity<ResultVO> createWork(
            @RequestBody DraftingWorkSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireTenantAdmin(user);
        try {
            DraftingWorkVO created = draftingWorkService.createWork(
                    user.getTenantId(), resolveUserId(user), payload);
            Map<String, Object> resultMap = new HashMap<String, Object>();
            resultMap.put("item", created);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
                return badRequest(ex.getMessage());
        }
    }

            @Operation(summary = "기안양식 수정", security = { @SecurityRequirement(name = "Authorization") })
            @ApiResponses(value = {
                @ApiResponse(responseCode = "200", description = "수정 성공"),
                @ApiResponse(responseCode = "400", description = "입력값 오류"),
                @ApiResponse(responseCode = "403", description = "테넌트 관리자 권한 필요"),
                @ApiResponse(responseCode = "404", description = "수정 대상 없음")
            })
            @PutMapping("/{draftingWorkCategoryId}")
    public ResponseEntity<ResultVO> updateWork(
            @PathVariable Long draftingWorkCategoryId,
            @RequestBody DraftingWorkSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireTenantAdmin(user);
        try {
            DraftingWorkVO updated = draftingWorkService.updateWork(
                    user.getTenantId(), resolveUserId(user), draftingWorkCategoryId, payload);
            Map<String, Object> resultMap = new HashMap<String, Object>();
            resultMap.put("item", updated);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
                return badRequest(ex.getMessage());
        } catch (NoSuchElementException ex) {
            Map<String, Object> errorMap = new HashMap<String, Object>();
            errorMap.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
        }
    }

    @Operation(summary = "기안양식 본문 템플릿 조회", security = { @SecurityRequirement(name = "Authorization") })
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "조회 성공"),
        @ApiResponse(responseCode = "404", description = "기안양식을 찾을 수 없음"),
        @ApiResponse(responseCode = "401", description = "인증되지 않은 사용자")
    })
    @GetMapping("/{draftingWorkCategoryId}/template")
    public ResponseEntity<ResultVO> getTemplate(
            @PathVariable Long draftingWorkCategoryId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            DraftingWorkTemplateVO template = draftingWorkService.getTemplate(
                    user.getTenantId(), draftingWorkCategoryId);
            Map<String, Object> resultMap = new HashMap<String, Object>();
            resultMap.put("item", template);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (NoSuchElementException ex) {
            return notFound(ex.getMessage());
        }
    }

    @Operation(summary = "기안양식 본문 템플릿 저장", security = { @SecurityRequirement(name = "Authorization") })
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "저장 성공"),
        @ApiResponse(responseCode = "400", description = "템플릿 입력값 오류"),
        @ApiResponse(responseCode = "403", description = "테넌트 관리자 권한 필요"),
        @ApiResponse(responseCode = "404", description = "기안양식을 찾을 수 없음")
    })
    @PutMapping("/{draftingWorkCategoryId}/template")
    public ResponseEntity<ResultVO> saveTemplate(
            @PathVariable Long draftingWorkCategoryId,
            @RequestBody DraftingWorkTemplateSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireTenantAdmin(user);
        try {
            DraftingWorkTemplateVO template = draftingWorkService.saveTemplate(
                    user.getTenantId(), draftingWorkCategoryId, user.getId(), payload);
            Map<String, Object> resultMap = new HashMap<String, Object>();
            resultMap.put("item", template);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        } catch (NoSuchElementException ex) {
            return notFound(ex.getMessage());
        }
    }

    private void requireTenantAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private ResponseEntity<ResultVO> badRequest(String message) {
        Map<String, Object> errorMap = new HashMap<String, Object>();
        errorMap.put("message", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
    }

    private ResponseEntity<ResultVO> notFound(String message) {
        Map<String, Object> errorMap = new HashMap<String, Object>();
        errorMap.put("message", message);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
    }

    private Long resolveUserId(LoginVO user) {
        if (user == null || !StringUtils.hasText(user.getUniqId())) {
            return null;
        }
        try {
            return Long.valueOf(user.getUniqId().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}