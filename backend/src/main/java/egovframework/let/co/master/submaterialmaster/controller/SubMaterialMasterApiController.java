package egovframework.let.co.master.submaterialmaster.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.submaterialmaster.service.SubMaterialMasterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 기초정보 > 부자재마스터(화면ID BSSubMaterialMasterView) 컨트롤러 클래스
 * 부자재는 원재료와 같은 표(materials)에 분류(sub_category)로만 갈려 있어, 등록 · 수정 · 단가는 원재료마스터 API 를 같이 쓴다.
 * 여기서는 부자재 목록만 준다(2026-10-20 원재료마스터에서 나눔).
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/sub-material-master")
@Tag(name = "SubMaterialMasterApiController", description = "기초정보 - 부자재마스터")
public class SubMaterialMasterApiController {

    private final ResultVoHelper resultVoHelper;
    private final SubMaterialMasterService subMaterialMasterService;

    @Operation(summary = "부자재 목록(분류로 거름)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SubMaterialMasterApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listSubMaterials(@RequestParam(name = "category", required = false) String category) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", subMaterialMasterService.listSubMaterials(category));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
