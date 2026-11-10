package egovframework.let.qm.haccp.prerequisite.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoicesSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySaveRequestVO;
import egovframework.let.qm.haccp.prerequisite.service.PrerequisiteFormService;
import egovframework.let.qm.haccp.prerequisite.service.PrerequisiteService;
import egovframework.let.qm.haccp.prerequisite.service.SurveyRecordConflictException;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 품질관리 > HACCP > HACCP(선행) 컨트롤러 클래스 (송연 qsurvey.py). 2026-11-09 점검표 열기 · 임시저장 · 현황 · 양식 만들기(결재는 방식 미정)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/qm/haccp/prerequisite")
@Tag(name = "PrerequisiteApiController", description = "품질관리 - HACCP(선행)")
public class PrerequisiteApiController {

    private static final String TAG = "PrerequisiteApiController";

    private final ResultVoHelper resultVoHelper;
    private final PrerequisiteService prerequisiteService;
    private final PrerequisiteFormService prerequisiteFormService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    private ResultVO ok(String key, Object value) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put(key, value);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        Map<String, Object> resultMap = new HashMap<>();
        // 그 기간에 이미 쓴 장 때문이면 그 장 번호 · 날짜를 함께 준다
        if (ex instanceof SurveyRecordConflictException) {
            SurveyRecordConflictException conflict = (SurveyRecordConflictException) ex;
            resultMap.put("existingId", conflict.getExistingId());
            resultMap.put("existingDate", conflict.getExistingDate());
            resultMap.put("inReview", conflict.isInReview());
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }

    @Operation(summary = "쓸 서류(살아 있고 질문이 있는 설문형 양식) → resultList", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/forms/pick")
    public ResultVO pickForms() throws Exception {
        return ok("resultList", prerequisiteService.listPickForms());
    }

    @Operation(summary = "빈 점검표(?formId=&docDate=&clientCode=) → sheet. 그 기간에 이미 쓴 장은 existingId", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/blank")
    public ResultVO blank(@RequestParam(name = "formId") int formId,
            @RequestParam(name = "docDate", required = false) String docDate,
            @RequestParam(name = "clientCode", required = false) String clientCode) throws Exception {
        try {
            return ok("sheet", prerequisiteService.blank(formId, docDate, clientCode));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "점검표 임시저장(상태 작성중) → result(id · status · score · scoreMax · answered · bad)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/records")
    public ResultVO save(@RequestBody SurveySaveRequestVO payload, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            return ok("result", prerequisiteService.save(payload, loginEmployeeResolver.employeeId(user)));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "현황 목록(?start=&end=&formId=) → resultList(최대 300줄)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/records")
    public ResultVO records(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "formId", required = false) Integer formId) throws Exception {
        return ok("resultList", prerequisiteService.listRecords(start, end, formId));
    }

    @Operation(summary = "쓴 점검표 한 장(그때의 판으로) → sheet", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/records/{recordId}")
    public ResultVO record(@PathVariable("recordId") int recordId) throws Exception {
        try {
            return ok("sheet", prerequisiteService.getRecord(recordId));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "안 쓴 기간 → resultList", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/missing")
    public ResultVO missing() throws Exception {
        return ok("resultList", prerequisiteService.missing());
    }

    // ---------------------------------------------------------------- 양식 만들기(2026-11-09)

    private interface Action {
        Object run() throws Exception;
    }

    private ResultVO attempt(String key, Action action) throws Exception {
        try {
            return ok(key, action.run());
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "양식 목록(살아 있는 것 먼저) → resultList", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/forms")
    public ResultVO forms() throws Exception {
        return ok("resultList", prerequisiteFormService.listForms());
    }

    @Operation(summary = "새 서류(질문 가져오기 copyFrom) → result(id · copied)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/forms")
    public ResultVO createForm(@RequestBody SurveyFormSaveVO payload, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return attempt("result", () -> prerequisiteFormService.createForm(payload, loginEmployeeResolver.employeeId(user)));
    }

    @Operation(summary = "양식 한 벌 → form", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/forms/{formId}")
    public ResultVO form(@PathVariable("formId") int formId) throws Exception {
        return attempt("form", () -> prerequisiteFormService.getForm(formId));
    }

    @Operation(summary = "제목 · 분류 · 대상 · 기간 고치기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/forms/{formId}")
    public ResultVO updateForm(@PathVariable("formId") int formId, @RequestBody SurveyFormSaveVO payload) throws Exception {
        return attempt("formId", () -> {
            prerequisiteFormService.updateForm(formId, payload);
            return formId;
        });
    }

    @Operation(summary = "목록에서 내리기 · 다시 올리기({active})", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/forms/{formId}/active")
    public ResultVO formActive(@PathVariable("formId") int formId, @RequestBody Map<String, Object> payload) throws Exception {
        boolean active = "true".equals(String.valueOf(payload.get("active")));
        return attempt("active", () -> {
            prerequisiteFormService.setActive(formId, active);
            return active;
        });
    }

    @Operation(summary = "보기 · 칸 저장(쓴 판이면 새 판) → versionId", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/forms/{formId}/choices")
    public ResultVO saveChoices(@PathVariable("formId") int formId, @RequestBody SurveyChoicesSaveVO payload, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return attempt("versionId", () -> prerequisiteFormService.saveChoices(formId, payload, loginEmployeeResolver.employeeId(user)));
    }

    @Operation(summary = "줄 넣기(afterId 바로 밑, 없으면 맨 끝) → id", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/forms/{formId}/items")
    public ResultVO addItem(@PathVariable("formId") int formId, @RequestBody SurveyItemSaveVO payload, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return attempt("id", () -> prerequisiteFormService.addItem(formId, payload, loginEmployeeResolver.employeeId(user)));
    }

    @Operation(summary = "줄 고치기 → id", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/items/{itemId}")
    public ResultVO updateItem(@PathVariable("itemId") int itemId, @RequestBody SurveyItemSaveVO payload, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return attempt("id", () -> prerequisiteFormService.updateItem(itemId, payload, loginEmployeeResolver.employeeId(user)));
    }

    @Operation(summary = "줄 지우기(묶음이면 안의 줄까지) → deleted", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/items/{itemId}")
    public ResultVO deleteItem(@PathVariable("itemId") int itemId, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return attempt("deleted", () -> prerequisiteFormService.deleteItem(itemId, loginEmployeeResolver.employeeId(user)));
    }

    @Operation(summary = "줄 옮기기({dir: up/down}) → moved", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/items/{itemId}/move")
    public ResultVO moveItem(@PathVariable("itemId") int itemId, @RequestBody Map<String, Object> payload, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        String dir = String.valueOf(payload.get("dir"));
        return attempt("moved", () -> prerequisiteFormService.moveItem(itemId, dir, loginEmployeeResolver.employeeId(user)));
    }
}
