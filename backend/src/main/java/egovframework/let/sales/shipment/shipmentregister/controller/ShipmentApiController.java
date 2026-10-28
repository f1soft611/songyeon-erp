package egovframework.let.sales.shipment.shipmentregister.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.shipment.shipmentregister.domain.model.ShipmentVO;
import egovframework.let.sales.shipment.shipmentregister.service.ShipmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 영업관리 > 출하등록 컨트롤러 클래스
 * (송연 /api/sa/sa0005 를 S_ERP 규칙으로 옮김. 거래처·품목 후보는 수주등록 API 를 같이 쓴다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/shipment/shipment-register")
@Tag(name = "ShipmentApiController", description = "영업관리 - 출하등록")
public class ShipmentApiController {

    private static final String TAG = "ShipmentApiController";

    private final ResultVoHelper resultVoHelper;
    private final ShipmentService shipmentService;

    @Operation(summary = "출고일의 출하 목록(출하등록 줄 + 생산연동 줄)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listShipments(@RequestParam(name = "date", required = false) String date) throws Exception {
        try {
            return list(shipmentService.listShipments(date));
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "출하 추가(수주에서 가져온 줄이면 수주에 가져감 표시)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공. result.id") })
    @PostMapping
    public ResultVO createShipment(@RequestBody ShipmentVO request) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("id", shipmentService.createShipment(request));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "출하등록 줄의 실출하량", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PutMapping("/{id}/actual-qty")
    public ResultVO updateActualQty(@PathVariable long id, @RequestBody Map<String, Object> body) throws Exception {
        try {
            shipmentService.updateActualQty(id, body == null ? null : body.get("actualQty"));
            return saved();
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "생산연동 줄의 실출하량", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공") })
    @PutMapping("/production/{lotId}/actual-qty")
    public ResultVO updateProductionActualQty(@PathVariable long lotId, @RequestBody Map<String, Object> body) throws Exception {
        try {
            shipmentService.updateProductionActualQty(lotId, body == null ? null : body.get("actualQty"));
            return saved();
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "출하 삭제", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "삭제 성공") })
    @DeleteMapping("/{id}")
    public ResultVO deleteShipment(@PathVariable long id) throws Exception {
        try {
            shipmentService.deleteShipment(id);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS, "삭제되었습니다");
        } catch (IllegalArgumentException ex) {
            return inputError(ex);
        }
    }

    @Operation(summary = "로트 배분 조회", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/{id}/lot-allocation")
    public ResultVO getAllocations(@PathVariable long id) throws Exception {
        return list(shipmentService.getAllocations(id));
    }

    @Operation(summary = "로트 배분 저장(통째로 다시 적음)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "저장 성공. result.count") })
    @SuppressWarnings("unchecked")
    @PutMapping("/{id}/lot-allocation")
    public ResultVO saveAllocations(@PathVariable long id, @RequestBody Map<String, Object> body) throws Exception {
        try {
            Object items = body == null ? null : body.get("allocations");
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("count", shipmentService.saveAllocations(id, items instanceof List ? (List<Map<String, Object>>) items : null));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS, "저장되었습니다");
        } catch (IllegalArgumentException | ClassCastException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR,
                    ex instanceof IllegalArgumentException ? ex.getMessage() : "로트와 수량을 숫자로 정해주세요");
        }
    }

    @Operation(summary = "로트 선택: 품목명(규격)과 같은 제품의 로트와 잔량", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공. result.item") })
    @GetMapping("/lots")
    public ResultVO listLots(@RequestParam(name = "productName", required = false) String productName) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", shipmentService.listLots(productName));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "로트 선택의 생산예정 수주", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/planned-orders")
    public ResultVO listPlannedOrders(@RequestParam(name = "productName", required = false) String productName) throws Exception {
        return list(shipmentService.listPlannedOrders(productName));
    }

    @Operation(summary = "수주등록 가져오기 목록(물류출고일 기간)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping("/import-orders")
    public ResultVO listImportOrders(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end) throws Exception {
        return list(shipmentService.listImportOrders(start, end));
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
