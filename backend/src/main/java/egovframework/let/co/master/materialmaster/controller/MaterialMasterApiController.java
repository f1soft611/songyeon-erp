package egovframework.let.co.master.materialmaster.controller;

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
import egovframework.let.co.master.materialmaster.domain.model.MaterialCreateRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialInfoSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialReplaceRequestVO;
import egovframework.let.co.master.materialmaster.service.MaterialMasterService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 기초정보 > 원재료BOM·부자재BOM 컨트롤러 클래스
 * (송연 /api/cm/cm0001/material-master · sub-material-master 를 S_ERP 규칙으로 옮김.
 *  부자재는 원재료와 같은 표에 분류로만 갈려 있어 등록·수정 API 를 함께 쓴다.)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/material-master")
@Tag(name = "MaterialMasterApiController", description = "기초정보 - 원재료BOM·부자재BOM")
public class MaterialMasterApiController {

    private static final String TAG = "MaterialMasterApiController";

    private final ResultVoHelper resultVoHelper;
    private final MaterialMasterService materialMasterService;
    /** 로그인 사원 사번(등록자 · 수정자, 2026-10-23) */
    private final LoginEmployeeResolver loginEmployeeResolver;

    @Operation(summary = "원재료 목록(부자재 포함, 이름·코드 검색)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listMaterials(@RequestParam(name = "q", required = false) String q) throws Exception {
        return list(materialMasterService.listMaterials(q));
    }

    @Operation(summary = "납품업체 자동완성(매입 거래처의 업체코드·업체명)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/vendors")
    public ResultVO listVendors() throws Exception {
        return list(materialMasterService.listVendors());
    }

    @Operation(summary = "이름·규격이 같은 원재료 찾기(띄어쓰기·대소문자 무시, 저장 전 확인용)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/same")
    public ResultVO listSameMaterials(@RequestParam(name = "name", required = false) String name,
            @RequestParam(name = "spec", required = false) String spec,
            @RequestParam(name = "excludeCode", required = false) String excludeCode) throws Exception {
        return list(materialMasterService.listSameMaterials(name, spec, excludeCode));
    }

    @Operation(summary = "신규 원재료 등록(코드 발번)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "등록 성공. result.code = 발번한 원재료코드") })
    @PostMapping
    public ResultVO createMaterial(@RequestBody MaterialCreateRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            MaterialCreateRequestVO request = payload == null ? new MaterialCreateRequestVO() : payload;
            request.setRegUserId(loginEmployeeResolver.employeeId(user));
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("code", materialMasterService.createMaterial(request));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "원재료 · 부자재 사용여부 바꾸기 {useYn: Y/N}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PutMapping("/{code}/use-yn")
    public ResultVO updateMaterialUseYn(@PathVariable String code, @RequestBody Map<String, Object> body,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            Object useYn = body == null ? null : body.get("useYn");
            materialMasterService.updateMaterialUseYn(code, useYn == null ? null : String.valueOf(useYn),
                    loginEmployeeResolver.employeeId(user));
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "원재료 기본정보 저장(보낸 칸만 고침)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공. result.item = 이름 변경 연쇄 결과") })
    @PutMapping("/{code}/info")
    public ResultVO saveMaterialInfo(@PathVariable String code, @RequestBody Map<String, Object> body,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            MaterialInfoSaveResultVO saved = materialMasterService.saveMaterialInfo(code, body);
            materialMasterService.markMaterialUpdated(code, loginEmployeeResolver.employeeId(user));
            return item(saved);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "원재료 단가 저장(앞날이면 예약)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공. result.item = scheduled·effectiveDate·affectedProducts") })
    @PostMapping("/{code}/price")
    public ResultVO saveMaterialPrice(@PathVariable String code, @RequestBody MaterialPriceRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            MaterialPriceSaveResultVO saved = materialMasterService.saveMaterialPrice(code, payload);
            // 앞날로 예약한 단가는 아직 원재료를 고치지 않아 수정으로 치지 않는다(그날 자동 반영도 마찬가지)
            if (!Boolean.TRUE.equals(saved.getScheduled())) {
                materialMasterService.markMaterialUpdated(code, loginEmployeeResolver.employeeId(user));
            }
            return item(saved);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "원재료 단가 변경로그", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/{code}/price-log")
    public ResultVO listPriceLog(@PathVariable String code) throws Exception {
        return list(materialMasterService.listPriceLog(code));
    }

    @Operation(summary = "원재료 예약 단가변경", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/{code}/price-schedule")
    public ResultVO listPriceSchedule(@PathVariable String code) throws Exception {
        return list(materialMasterService.listPriceSchedule(code));
    }

    @Operation(summary = "예약 단가변경 취소(적용 전만)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "취소 성공") })
    @DeleteMapping("/price-schedule/{id}")
    public ResultVO cancelPriceSchedule(@PathVariable Long id) throws Exception {
        materialMasterService.cancelPriceSchedule(id);
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
    }

    @Operation(summary = "배합비 역전개(이 원재료를 쓰는 제품)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/{code}/usage")
    public ResultVO listUsage(@PathVariable String code) throws Exception {
        return list(materialMasterService.listUsage(code));
    }

    @Operation(summary = "원재료 일괄적용(고른 제품 배합표에서 교체)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "교체 성공. result.affectedCount = 바꾼 제품 수") })
    @PostMapping("/{code}/bulk-replace")
    public ResultVO replaceMaterial(@PathVariable String code, @RequestBody MaterialReplaceRequestVO payload) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("affectedCount", materialMasterService.replaceMaterial(code, payload));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    private ResultVO list(Object rows) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", rows);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private ResultVO item(Object value) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", value);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
