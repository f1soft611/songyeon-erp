package egovframework.let.qm.labelregister.controller;

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
import egovframework.let.qm.label.domain.model.LabelVO;
import egovframework.let.qm.labelregister.domain.model.LabelContentVO;
import egovframework.let.qm.labelregister.domain.model.LabelFieldVO;
import egovframework.let.qm.labelregister.domain.model.LabelMarkSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelTemplateSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelVersionRequestVO;
import egovframework.let.qm.labelregister.service.LabelRegisterService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 품질관리 > 라벨등록 컨트롤러 클래스 (송연 label.py 의 저장 · 목록 · 양식/마크/항목/회사 고정정보 · 표시사항 요청을 S_ERP 규칙으로 옮김)
 * 버전 목록 · 버전 한 개 · 양식 · 마크 · 회사정보 · 배합표 조회는 공용 라벨 API(/api/v1/qm/label)를 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/qm/label-register")
@Tag(name = "LabelRegisterApiController", description = "품질관리 - 라벨등록")
public class LabelRegisterApiController {

    private static final String TAG = "LabelRegisterApiController";

    private final ResultVoHelper resultVoHelper;
    private final LabelRegisterService labelRegisterService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    private interface Work {
        void run(Map<String, Object> resultMap) throws Exception;
    }

    private ResultVO handle(Work work) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        try {
            work.run(resultMap);
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    // 2026-10-26 만든 사람 · 고친 사람은 로그인한 사원의 사번(예전에는 이름)
    private String who(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "라벨등록 제품 목록(?q=) labelState: done · partial · none", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/products")
    public ResultVO products(@RequestParam(name = "q", required = false) String q) throws Exception {
        return handle(map -> map.put("resultList", labelRegisterService.listProducts(q)));
    }

    @Operation(summary = "라벨 내용 저장(versionId 가 없으면 사용중 버전) → {versionId, isCurrent}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/products/{code}/label")
    public ResultVO saveLabel(@PathVariable("code") String code, @RequestBody LabelContentVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("item", labelRegisterService.saveLabel(code, request, who(user))));
    }

    @Operation(summary = "라벨 모양 저장 {versionId, size, format_id, recycle}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/products/{code}/layout")
    public ResultVO saveLayout(@PathVariable("code") String code, @RequestBody Map<String, Object> request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> labelRegisterService.saveLayout(code, request, who(user)));
    }

    @Operation(summary = "새 버전 {fromVersionId, versionLabel, note} → {id, versionLabel}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/products/{code}/versions")
    public ResultVO newVersion(@PathVariable("code") String code, @RequestBody LabelVersionRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("item", labelRegisterService.newVersion(code, request, who(user))));
    }

    @Operation(summary = "버전 이름·메모 {versionLabel, note}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/versions/{id}/info")
    public ResultVO renameVersion(@PathVariable("id") long id, @RequestBody LabelVersionRequestVO request) throws Exception {
        return handle(map -> labelRegisterService.renameVersion(id, request));
    }

    @Operation(summary = "이 버전 사용(이때부터 이 내용으로 인쇄)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/versions/{id}/use")
    public ResultVO useVersion(@PathVariable("id") long id) throws Exception {
        return handle(map -> labelRegisterService.useVersion(id));
    }

    @Operation(summary = "버전 삭제(사용중 · 마지막 버전은 못 지움)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/versions/{id}")
    public ResultVO deleteVersion(@PathVariable("id") long id) throws Exception {
        return handle(map -> labelRegisterService.deleteVersion(id));
    }

    @Operation(summary = "다른 제품 라벨 가져오기 후보(?exclude=&q=)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/source-products")
    public ResultVO sourceProducts(@RequestParam(name = "exclude", required = false) String exclude,
            @RequestParam(name = "q", required = false) String q) throws Exception {
        return handle(map -> map.put("resultList", labelRegisterService.sourceProducts(exclude, q)));
    }

    @Operation(summary = "회사 고정정보 저장", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/company-info")
    public ResultVO updateCompanyInfo(@RequestBody LabelVO request) throws Exception {
        return handle(map -> labelRegisterService.updateCompanyInfo(request));
    }

    @Operation(summary = "양식 만들기 {name, size, layout} → {id}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/templates")
    public ResultVO createTemplate(@RequestBody LabelTemplateSaveVO request) throws Exception {
        return handle(map -> map.put("id", labelRegisterService.saveTemplate(null, request)));
    }

    @Operation(summary = "양식 고치기(이 양식을 쓰는 라벨이 모두 함께 바뀐다)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/templates/{id}")
    public ResultVO updateTemplate(@PathVariable("id") long id, @RequestBody LabelTemplateSaveVO request) throws Exception {
        return handle(map -> map.put("id", labelRegisterService.saveTemplate(id, request)));
    }

    @Operation(summary = "양식 삭제", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/templates/{id}")
    public ResultVO deleteTemplate(@PathVariable("id") long id) throws Exception {
        return handle(map -> labelRegisterService.deleteTemplate(id));
    }

    @Operation(summary = "이 양식을 쓰는 제품 {count, products}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/templates/{id}/usage")
    public ResultVO templateUsage(@PathVariable("id") long id) throws Exception {
        return handle(map -> map.put("item", labelRegisterService.templateUsage(id)));
    }

    @Operation(summary = "마크 넣기 {name, dataUrl, widthMm} → {id}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/marks")
    public ResultVO addMark(@RequestBody LabelMarkSaveVO request) throws Exception {
        return handle(map -> map.put("id", labelRegisterService.addMark(request)));
    }

    @Operation(summary = "마크 삭제(쓰는 라벨이 있으면 막음)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/marks/{id}")
    public ResultVO deleteMark(@PathVariable("id") long id) throws Exception {
        return handle(map -> labelRegisterService.deleteMark(id));
    }

    @Operation(summary = "라벨 항목 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/fields")
    public ResultVO fields() throws Exception {
        return handle(map -> map.put("resultList", labelRegisterService.listFields()));
    }

    @Operation(summary = "라벨 항목 만들기 {name} → {id, name}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/fields")
    public ResultVO addField(@RequestBody LabelFieldVO request) throws Exception {
        return handle(map -> map.put("item", labelRegisterService.addField(request.getName())));
    }

    @Operation(summary = "라벨 항목 삭제(양식에서 쓰면 막음)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/fields/{id}")
    public ResultVO deleteField(@PathVariable("id") long id) throws Exception {
        return handle(map -> labelRegisterService.deleteField(id));
    }

    @Operation(summary = "표시사항 요청 목록(?status=requested · done)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/requests")
    public ResultVO requests(@RequestParam(name = "status", required = false) String status) throws Exception {
        return handle(map -> map.put("resultList", labelRegisterService.listRequests(status)));
    }

    @Operation(summary = "표시사항 요청 한 건(배합표 포함)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/requests/{id}")
    public ResultVO request(@PathVariable("id") long id) throws Exception {
        return handle(map -> map.put("item", labelRegisterService.getRequest(id)));
    }

    @Operation(summary = "표시사항 요청 저장 → {status}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/requests/{id}")
    public ResultVO saveRequest(@PathVariable("id") long id, @RequestBody LabelContentVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("status", labelRegisterService.saveRequest(id, request, who(user))));
    }

    @Operation(summary = "제품으로 옮기기 {productCode} → {productCode, copiedFields}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/requests/{id}/move")
    public ResultVO moveRequest(@PathVariable("id") long id, @RequestBody Map<String, String> request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("item", labelRegisterService.moveRequest(id, request.get("productCode"), who(user))));
    }
}
