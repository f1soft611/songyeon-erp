package egovframework.let.co.master.itemmaster.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import egovframework.let.co.master.itemmaster.domain.model.BomSaveRequestVO;
import egovframework.let.co.master.itemmaster.domain.model.MaterialCheckRequestVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductDiscontinueRequestVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductInfoSaveRequestVO;
import egovframework.let.co.master.itemmaster.domain.model.SubMaterialsSaveRequestVO;
import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 기초정보 > 제품BOM 컨트롤러 클래스
 * (송연 /api/cm/cm0001/products·materials·clients 를 S_ERP 규칙으로 옮김. 송연에는 권한 개념이 없어 로그인 사용자 모두 사용)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/item-master")
@Tag(name = "ItemMasterApiController", description = "기초정보 - 제품BOM")
public class ItemMasterApiController {

    private final ResultVoHelper resultVoHelper;
    private final ItemMasterService itemMasterService;
    /** 로그인 사원 사번(수정자 · 수정일시용, 2026-10-23) */
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 저장이 끝난 뒤 수정자 · 수정일시를 남긴다
    private void markUpdated(String code, LoginVO user) throws Exception {
        itemMasterService.markProductUpdated(code, loginEmployeeResolver.employeeId(user));
    }

    @Operation(summary = "제품 목록", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping
    public ResultVO listProducts(
            @RequestParam(name = "includeDiscontinued", defaultValue = "false") boolean includeDiscontinued) throws Exception {
        return list(itemMasterService.listProducts(includeDiscontinued));
    }

    @Operation(summary = "배합비", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/{code}/bom")
    public ResultVO getBom(@PathVariable String code) throws Exception {
        return list(itemMasterService.getBom(code));
    }

    @Operation(summary = "배합비 저장(통째로 다시 적음). result.materialCost = 다시 계산한 원재료비",
            security = { @SecurityRequirement(name = "Authorization") })
    @PutMapping("/{code}/bom")
    public ResultVO saveBom(@PathVariable String code, @RequestBody BomSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            double materialCost = itemMasterService.saveBom(code, payload == null ? null : payload.getBom());
            markUpdated(code, user);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("materialCost", materialCost);
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "배합비 변경로그", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/{code}/bom-log")
    public ResultVO getBomLog(@PathVariable String code) throws Exception {
        return list(itemMasterService.getBomLog(code));
    }

    @Operation(summary = "기본정보 저장", security = { @SecurityRequirement(name = "Authorization") })
    @PutMapping("/{code}/info")
    public ResultVO saveProductInfo(@PathVariable String code, @RequestBody ProductInfoSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            itemMasterService.saveProductInfo(code, payload);
            markUpdated(code, user);
            return saved();
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "사용안함 / 되돌리기", security = { @SecurityRequirement(name = "Authorization") })
    @PutMapping("/{code}/discontinue")
    public ResultVO setDiscontinued(@PathVariable String code, @RequestBody ProductDiscontinueRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            boolean off = payload == null || payload.getDiscontinued() == null || payload.getDiscontinued();
            itemMasterService.setDiscontinued(code, off, payload == null ? null : payload.getNote(),
                    user == null ? null : user.getName());
            markUpdated(code, user);
            return saved();
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "부자재", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/{code}/sub-materials")
    public ResultVO getSubMaterials(@PathVariable String code) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", itemMasterService.getSubMaterials(code));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "부자재 저장", security = { @SecurityRequirement(name = "Authorization") })
    @PutMapping("/{code}/sub-materials")
    public ResultVO saveSubMaterials(@PathVariable String code, @RequestBody SubMaterialsSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            itemMasterService.saveSubMaterials(code, payload);
            markUpdated(code, user);
            return saved();
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "원재료 고르기 목록", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/materials")
    public ResultVO listMaterials() throws Exception {
        return list(itemMasterService.listMaterials());
    }

    @Operation(summary = "원재료명 확인", security = { @SecurityRequirement(name = "Authorization") })
    @PostMapping("/materials/check")
    public ResultVO checkMaterials(@RequestBody MaterialCheckRequestVO payload) throws Exception {
        return list(itemMasterService.checkMaterials(payload == null ? null : payload.getNames()));
    }

    @Operation(summary = "거래처 고르기 목록(사용 중, 코드 · 이름)", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/client-options")
    public ResultVO listClientOptions() throws Exception {
        return list(itemMasterService.listClientOptions());
    }

    @Operation(summary = "거래처BOM 이름 목록", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/clients")
    public ResultVO listClients() throws Exception {
        return list(itemMasterService.listClientNames());
    }

    private ResultVO list(List<?> rows) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", rows);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private ResultVO saved() {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "저장되었습니다");
    }

    private ResultVO inputError(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
