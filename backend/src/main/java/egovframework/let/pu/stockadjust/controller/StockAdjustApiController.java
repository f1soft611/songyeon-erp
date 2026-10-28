package egovframework.let.pu.stockadjust.controller;

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
import egovframework.let.pu.stockadjust.domain.model.MovementRequestVO;
import egovframework.let.pu.stockadjust.domain.model.ScheduleEditRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockConfirmRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockUploadRequestVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveRequestVO;
import egovframework.let.pu.stockadjust.service.StockAdjustService;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매관리 > 재고조정 컨트롤러 클래스 (송연 /api/materials/stock-* · /api/materials/{code}/movement · /api/products/stock-*
 * · /api/warehouse-moves 를 S_ERP 규칙으로 옮김). 제품 전체 재고·로트는 제품재고관리 API(/api/v1/lg/product-stock)를 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pu/stock-adjust")
@Tag(name = "StockAdjustApiController", description = "구매관리 - 재고조정")
public class StockAdjustApiController {

    private static final String TAG = "StockAdjustApiController";

    private final ResultVoHelper resultVoHelper;
    private final StockAdjustService stockAdjustService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    // 2026-10-26 제품 재고 원장(product_stock_movement)의 '누가' 는 로그인한 사원의 사번
    private String employeeId(LoginVO user) {
        return loginEmployeeResolver.employeeId(user);
    }

    @FunctionalInterface
    private interface Work {
        Object run() throws Exception;
    }

    // ===== 원재료 재고조정 =====

    @Operation(summary = "대기 중인 원재료 재고조정", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/materials/schedule")
    public ResultVO materialSchedule() throws Exception {
        return list(stockAdjustService.listMaterialSchedule());
    }

    @Operation(summary = "원재료 재고조사 엑셀 줄 올리기 {staged, skipped}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/materials/upload")
    public ResultVO uploadMaterial(@RequestBody StockUploadRequestVO request) throws Exception {
        return item(() -> stockAdjustService.uploadMaterial(request));
    }

    @Operation(summary = "대기 원재료 재고조정 수량 고치기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/materials/schedule/{id}")
    public ResultVO editMaterial(@PathVariable("id") long id, @RequestBody ScheduleEditRequestVO request) throws Exception {
        return done(() -> { stockAdjustService.editMaterialSchedule(id, request == null ? null : request.getEditedQty()); return null; });
    }

    @Operation(summary = "대기 원재료 재고조정 한 줄 취소", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/materials/schedule/{id}")
    public ResultVO cancelMaterial(@PathVariable("id") long id) throws Exception {
        return done(() -> { stockAdjustService.cancelMaterialSchedule(id); return null; });
    }

    @Operation(summary = "대기 원재료 재고조정 전체 취소 {cancelled}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/materials/schedule")
    public ResultVO cancelAllMaterial() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("cancelled", stockAdjustService.cancelAllMaterialSchedule());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "대기 원재료 재고조정 전체 확정 {confirmed, effectiveDate}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/materials/confirm")
    public ResultVO confirmMaterial(@RequestBody StockConfirmRequestVO request) throws Exception {
        return item(() -> stockAdjustService.confirmMaterial(request));
    }

    @Operation(summary = "적용된 원재료 재고조정 내역", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/materials/history")
    public ResultVO materialHistory(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end) throws Exception {
        return list(stockAdjustService.listMaterialHistory(start, end));
    }

    @Operation(summary = "전체 재고 조회(원재료)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/materials")
    public ResultVO materials() throws Exception {
        return list(stockAdjustService.listMaterials());
    }

    @Operation(summary = "원재료 재고 손으로 고치기(입고 · 출고 · 적용재고)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/materials/{code}/movement")
    public ResultVO moveMaterial(@PathVariable("code") String code, @RequestBody MovementRequestVO request) throws Exception {
        return done(() -> { stockAdjustService.moveMaterial(code, request); return null; });
    }

    // ===== 제품 재고조정 =====

    @Operation(summary = "대기 중인 제품 재고조정", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/products/schedule")
    public ResultVO productSchedule() throws Exception {
        return list(stockAdjustService.listProductSchedule());
    }

    @Operation(summary = "제품 재고조사 엑셀 줄 올리기 {staged, skipped}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/products/upload")
    public ResultVO uploadProduct(@RequestBody StockUploadRequestVO request) throws Exception {
        return item(() -> stockAdjustService.uploadProduct(request));
    }

    @Operation(summary = "대기 제품 재고조정 수량 고치기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/products/schedule/{id}")
    public ResultVO editProduct(@PathVariable("id") long id, @RequestBody ScheduleEditRequestVO request) throws Exception {
        return done(() -> { stockAdjustService.editProductSchedule(id, request == null ? null : request.getEditedQty()); return null; });
    }

    @Operation(summary = "대기 제품 재고조정 한 줄 취소", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/products/schedule/{id}")
    public ResultVO cancelProduct(@PathVariable("id") long id) throws Exception {
        return done(() -> { stockAdjustService.cancelProductSchedule(id); return null; });
    }

    @Operation(summary = "대기 제품 재고조정 전체 취소 {cancelled}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/products/schedule")
    public ResultVO cancelAllProduct() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("cancelled", stockAdjustService.cancelAllProductSchedule());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "대기 제품 재고조정 전체 확정 {confirmed, effectiveDate}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/products/confirm")
    public ResultVO confirmProduct(@RequestBody StockConfirmRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return item(() -> stockAdjustService.confirmProduct(request, employeeId(user)));
    }

    @Operation(summary = "제품 입출고 내역(원장)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/products/history")
    public ResultVO productHistory(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "productCode", required = false) String productCode,
            @RequestParam(name = "kind", required = false) String kind) throws Exception {
        return list(stockAdjustService.listProductHistory(start, end, productCode, kind));
    }

    // ===== 창고이동 =====

    @Operation(summary = "창고이동: 바코드(또는 원재료코드) 조회", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/warehouse-moves/lookup")
    public ResultVO lookup(@RequestParam(name = "barcode", required = false) String barcode) throws Exception {
        return item(() -> stockAdjustService.lookupWarehouseMove(barcode));
    }

    @Operation(summary = "창고이동: 옮겨갈 수 있는 창고(입고창고가 아닌 곳)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/warehouse-moves/targets")
    public ResultVO targets() throws Exception {
        return list(stockAdjustService.listMoveTargets());
    }

    @Operation(summary = "창고이동: 옮기기 {qty, toWarehouse}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/warehouse-moves")
    public ResultVO move(@RequestBody WarehouseMoveRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return item(() -> stockAdjustService.moveWarehouse(request, employeeId(user)));
    }

    @Operation(summary = "창고이동: 그 날 옮긴 것(날짜를 비우면 오늘)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/warehouse-moves")
    public ResultVO moves(@RequestParam(name = "date", required = false) String date) throws Exception {
        return list(stockAdjustService.listWarehouseMoves(date));
    }

    @Operation(summary = "창고이동 기록 취소", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/warehouse-moves/{id}")
    public ResultVO cancelMove(@PathVariable("id") long id) throws Exception {
        return done(() -> { stockAdjustService.cancelWarehouseMove(id); return null; });
    }

    private ResultVO list(Object rows) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", rows);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private ResultVO item(Work work) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", work.run());
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO done(Work work) throws Exception {
        try {
            work.run();
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return failed(ex);
        }
    }

    private ResultVO failed(IllegalArgumentException ex) {
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
    }
}
