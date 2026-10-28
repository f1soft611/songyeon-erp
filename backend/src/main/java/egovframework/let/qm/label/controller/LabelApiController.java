package egovframework.let.qm.label.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Callable;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.qm.label.service.LabelService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 제품 라벨 조회 컨트롤러 클래스 (송연 /api/qm/label 을 S_ERP 규칙으로 옮김).
 * 라벨출력·생산확정(🏷️ 라벨)·라벨등록 화면이 함께 쓰는 라벨 창이 부른다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/qm/label")
@Tag(name = "LabelApiController", description = "품질관리 - 제품 라벨 조회")
public class LabelApiController {

    private static final String TAG = "LabelApiController";

    private final ResultVoHelper resultVoHelper;
    private final LabelService labelService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    @Operation(summary = "제품의 라벨 버전 목록 {versions, currentId}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/products/{code}/versions")
    public ResultVO versions(@PathVariable("code") String code,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        // 2026-10-26 처음 열 때 v1 을 만들면 만든 사람(사번)으로 남긴다
        return item(() -> labelService.listVersions(code, loginEmployeeResolver.employeeId(user)));
    }

    @Operation(summary = "라벨 버전 한 개", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/versions/{id}")
    public ResultVO version(@PathVariable("id") long id) throws Exception {
        return item(() -> labelService.getVersion(id));
    }

    @Operation(summary = "라벨 양식 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/templates")
    public ResultVO templates() throws Exception {
        return list(labelService.listTemplates());
    }

    @Operation(summary = "라벨 양식 한 개", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/templates/{id}")
    public ResultVO template(@PathVariable("id") long id) throws Exception {
        return item(() -> labelService.getTemplate(id));
    }

    @Operation(summary = "분리배출마크 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/marks")
    public ResultVO marks() throws Exception {
        return list(labelService.listMarks());
    }

    @Operation(summary = "회사 고정정보", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/company-info")
    public ResultVO companyInfo() throws Exception {
        return item(() -> labelService.getCompanyInfo());
    }

    @Operation(summary = "제품 배합표(원재료명·함량)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/products/{code}/bom")
    public ResultVO bom(@PathVariable("code") String code) throws Exception {
        return list(labelService.getProductBom(code));
    }

    @Operation(summary = "배합표 원재료의 알러지유발물질 {allergens, text, sources}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/products/{code}/bom-allergens")
    public ResultVO bomAllergens(@PathVariable("code") String code) throws Exception {
        return item(() -> labelService.getBomAllergens(code));
    }

    private ResultVO list(Object rows) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", rows);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private ResultVO item(Callable<Object> load) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", load.call());
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }
}
