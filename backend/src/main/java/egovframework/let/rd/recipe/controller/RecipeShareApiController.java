package egovframework.let.rd.recipe.controller;

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
import egovframework.let.rd.recipe.domain.model.RecipeHandoffSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeShareSaveVO;
import egovframework.let.rd.recipe.service.RecipeShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 상품개발 > 레시피 검색·공유 · 레시피 공유 로그 컨트롤러 클래스 (송연 /api/recipe-handoffs · /api/recipe-shares 를 S_ERP 규칙으로 옮김)
 * 레시피 검색과 '보기' 는 레시피 작성 API(/api/v1/rd/recipe)를 같이 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rd/recipe-share")
@Tag(name = "RecipeShareApiController", description = "상품개발 - 레시피 검색·공유 · 공유 로그")
public class RecipeShareApiController {

    private static final String TAG = "RecipeShareApiController";

    private final ResultVoHelper resultVoHelper;
    private final RecipeShareService recipeShareService;
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

    // 송연 session employee_id · employee_name (넘긴 사람 · 공유를 등록한 사람)
    // employees.id 는 사번 문자열이다
    // 2026-10-22: 로그인 uniqId 가 tb_user 번호가 되어 사번은 도우미로 찾는다
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    private static String employeeName(LoginVO user) {
        return user == null ? null : user.getName();
    }

    @Operation(summary = "넘기기 {versionId, kind: 확정·견적·기타} → {handoffId, quoteId, message}. 확정·견적은 가견적, 기타는 표시사항 요청. 넘긴 버전은 잠긴다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/handoffs")
    public ResultVO handoff(@RequestBody RecipeHandoffSaveVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("item", recipeShareService.handoff(request.getVersionId(), request.getKind(), employeeId(user), employeeName(user))));
    }

    @Operation(summary = "공유 로그(넘긴 기록) ?draftId &kind &start=YYYY-MM-DD &end=YYYY-MM-DD", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/handoffs")
    public ResultVO handoffs(@RequestParam Map<String, String> filter) throws Exception {
        return handle(map -> map.put("resultList", recipeShareService.listHandoffs(filter)));
    }

    @Operation(summary = "공유 목록(만료 여부 포함)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/shares")
    public ResultVO shares() throws Exception {
        return handle(map -> map.put("resultList", recipeShareService.listShares()));
    }

    @Operation(summary = "공유 등록 {draftId, versionId, employeeId, expiresAt}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/shares")
    public ResultVO createShare(@RequestBody RecipeShareSaveVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> recipeShareService.createShare(request, employeeId(user)));
    }

    @Operation(summary = "공유 회수", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/shares/{id}")
    public ResultVO deleteShare(@PathVariable("id") long id) throws Exception {
        return handle(map -> recipeShareService.deleteShare(id));
    }
}
