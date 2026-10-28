package egovframework.let.rd.recipe.controller;

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
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.rd.recipe.domain.model.RecipeClientSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeSaveVO;
import egovframework.let.rd.recipe.service.RecipeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 상품개발 > 레시피 작성 컨트롤러 클래스 (송연 /api/recipe-clients · recipe-sales-reps · recipe-drafts · recipe-versions 를 S_ERP 규칙으로 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rd/recipe")
@Tag(name = "RecipeApiController", description = "상품개발 - 레시피 작성")
public class RecipeApiController {

    private static final String TAG = "RecipeApiController";

    private final ResultVoHelper resultVoHelper;
    private final RecipeService recipeService;
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

    // 송연 session employee_id (레시피·폴더를 만든 사람). employees.id 는 사번 문자열이다
    // 2026-10-22: 로그인 uniqId 가 tb_user 번호가 되어 사번은 도우미로 찾는다
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @Operation(summary = "업체 폴더 목록(영업담당자 · 레시피 수)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/clients")
    public ResultVO clients() throws Exception {
        return handle(map -> map.put("resultList", recipeService.listClients()));
    }

    @Operation(summary = "업체 폴더 만들기 · 영업담당자 바꾸기 {clientName, salesEmpId} → {clientName}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/clients")
    public ResultVO saveClient(@RequestBody RecipeClientSaveVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("clientName", recipeService.saveClient(request.getClientName(), request.getSalesEmpId(), employeeId(user))));
    }

    @Operation(summary = "영업담당자로 고를 사원(이름·부서)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/sales-reps")
    public ResultVO salesReps() throws Exception {
        return handle(map -> map.put("resultList", recipeService.listSalesReps()));
    }

    @Operation(summary = "레시피 목록(?clientName=딱 이 업체 &clientQ=업체 일부 &q=이름·업체 &category &saleType &stage=분류로 잠긴 버전)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/drafts")
    public ResultVO drafts(@RequestParam Map<String, String> filter) throws Exception {
        return handle(map -> map.put("resultList", recipeService.listDrafts(filter)));
    }

    @Operation(summary = "레시피 한 건 {draft, versions}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/drafts/{id}")
    public ResultVO draft(@PathVariable("id") long id) throws Exception {
        return handle(map -> map.put("item", recipeService.getDraft(id)));
    }

    @Operation(summary = "새 레시피(머리 정보 + 초안 버전 + 배합표) → {id, versionId}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/drafts")
    public ResultVO createDraft(@RequestBody RecipeSaveVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("item", recipeService.createDraft(request, employeeId(user))));
    }

    @Operation(summary = "레시피 머리 정보 고치기(업체명 제외)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/drafts/{id}")
    public ResultVO updateDraft(@PathVariable("id") long id, @RequestBody RecipeSaveVO request) throws Exception {
        return handle(map -> recipeService.updateDraft(id, request));
    }

    @Operation(summary = "레시피 지우기(버전·배합표·공유·공유로그까지)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/drafts/{id}")
    public ResultVO deleteDraft(@PathVariable("id") long id) throws Exception {
        return handle(map -> recipeService.deleteDraft(id));
    }

    @Operation(summary = "test 버전 추가(최신 버전 배합표를 베낌) {note} → {versionId, versionLabel}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/drafts/{id}/versions")
    public ResultVO addVersion(@PathVariable("id") long id, @RequestBody(required = false) Map<String, Object> request) throws Exception {
        String note = request == null || request.get("note") == null ? null : String.valueOf(request.get("note"));
        return handle(map -> map.put("item", recipeService.addVersion(id, note)));
    }

    @Operation(summary = "공유로그(언제·누가·어떤 분류로)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/drafts/{id}/stage-logs")
    public ResultVO stageLogs(@PathVariable("id") long id) throws Exception {
        return handle(map -> map.put("resultList", recipeService.stageLogs(id)));
    }

    @Operation(summary = "버전 한 개 {version, bom}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/versions/{id}")
    public ResultVO version(@PathVariable("id") long id) throws Exception {
        return handle(map -> map.put("item", recipeService.getVersion(id)));
    }

    @Operation(summary = "버전 배합표 저장(통째로 다시 적음). 공유된 버전은 막음 {bom, note}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/versions/{id}")
    public ResultVO saveVersion(@PathVariable("id") long id, @RequestBody RecipeSaveVO request) throws Exception {
        return handle(map -> recipeService.saveVersion(id, request, request.getNote()));
    }
}
