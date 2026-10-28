package egovframework.let.pu.stockadjust.service.impl;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.service.InventoryService;
import egovframework.let.common.inventory.service.MaterialStockSnapshotService;
import egovframework.let.pu.stockadjust.domain.model.MaterialStockVO;
import egovframework.let.pu.stockadjust.domain.model.MovementRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockConfirmRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockConfirmResultVO;
import egovframework.let.pu.stockadjust.domain.model.StockScheduleVO;
import egovframework.let.pu.stockadjust.domain.model.StockUploadRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockUploadResultVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseLookupVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveRequestVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveResultVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveVO;
import egovframework.let.pu.stockadjust.domain.repository.StockAdjustDAO;
import egovframework.let.pu.stockadjust.service.StockAdjustService;

/**
 * 구매관리 - 재고조정 서비스 구현 클래스 (송연 app.py 1570-2051 · 4925-5032 와 같은 규칙)
 * 원재료 '그 날짜 재고' 되감기는 공통 재고(MaterialStockSnapshotService.deltaAfter), 제품 재고와 원장은
 * 공통 재고 원장(InventoryService.moveProductStock)으로 한다 — 같은 계산을 여러 곳에 두지 않는다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("stockAdjustService")
public class StockAdjustServiceImpl extends EgovAbstractServiceImpl implements StockAdjustService {

    static final String DATE_MESSAGE = "반영일을 선택해주세요";
    static final String NOTE_MESSAGE = "조정 사유를 적어주세요 (예: 9월 정기 재고조사)";
    static final String NOTHING_MESSAGE = "확정할 재고조정 내역이 없습니다";
    static final String EDIT_NUMBER_MESSAGE = "수정할 수량은 숫자여야 합니다";
    static final String EDIT_MISSING_MESSAGE = "대기중인 재고조정 항목을 찾을 수 없습니다";
    static final String MATERIAL_MISSING_MESSAGE = "원재료를 찾을 수 없습니다";

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final StockAdjustDAO stockAdjustDAO;
    private final MaterialStockSnapshotService materialStockSnapshotService;
    private final InventoryService inventoryService;

    public StockAdjustServiceImpl(StockAdjustDAO stockAdjustDAO, MaterialStockSnapshotService materialStockSnapshotService,
            InventoryService inventoryService) {
        this.stockAdjustDAO = stockAdjustDAO;
        this.materialStockSnapshotService = materialStockSnapshotService;
        this.inventoryService = inventoryService;
    }

    // ===== 원재료 재고조정 =====

    @Override
    public List<StockScheduleVO> listMaterialSchedule() throws Exception {
        return withTarget(stockAdjustDAO.selectMaterialSchedule());
    }

    // 창고는 파일 하나에 하나다 — 현장에서는 계량창고와 자재창고를 따로 세서 파일 하나가 통째로 한 창고 것이다
    @Override
    public StockUploadResultVO uploadMaterial(StockUploadRequestVO payload) throws Exception {
        StockUploadRequestVO request = payload == null ? new StockUploadRequestVO() : payload;
        String warehouse = text(request.getWarehouse());
        if (warehouse != null && !stockAdjustDAO.selectWarehouseNames().contains(warehouse)) {
            throw new IllegalArgumentException("'" + warehouse + "'" + josa(warehouse, "은는")
                    + " 등록된 창고가 아닙니다. 기초정보 > 창고등록에서 먼저 등록해주세요");
        }
        return stage(request.getRows(), true, warehouse);
    }

    @Override
    public void editMaterialSchedule(long id, String editedQty) throws Exception {
        Double qty = toDouble(editedQty);
        if (qty == null) {
            throw new IllegalArgumentException(EDIT_NUMBER_MESSAGE);
        }
        if (stockAdjustDAO.updateMaterialScheduleEdited(id, qty) == 0) {
            throw new IllegalArgumentException(EDIT_MISSING_MESSAGE);
        }
    }

    @Override
    public void cancelMaterialSchedule(long id) throws Exception {
        stockAdjustDAO.deleteMaterialSchedule(id);
    }

    @Override
    public int cancelAllMaterialSchedule() throws Exception {
        return stockAdjustDAO.deleteMaterialPending();
    }

    // 센 값은 '반영일에 창고에 실제로 있던 양' 이다. materials.stock_qty 에는 앞날짜 생산지시가 이미 빠져 있어서
    // 센 값을 그대로 넣으면 800 을 세어 넣고도 화면에 900 이 뜬다 — 되감을 양을 더해서 넣는다(raw = 센 값 + 되감을 양)
    @Override
    public StockConfirmResultVO confirmMaterial(StockConfirmRequestVO payload) throws Exception {
        StockConfirmRequestVO request = payload == null ? new StockConfirmRequestVO() : payload;
        String date = text(request.getEffectiveDate());
        if (date == null) {
            throw new IllegalArgumentException(DATE_MESSAGE);
        }
        String note = text(request.getNote());
        if (note == null) {
            throw new IllegalArgumentException(NOTE_MESSAGE);
        }
        Map<String, Double> deltaAfter = materialStockSnapshotService.deltaAfter(date);
        List<StockScheduleVO> pending = stockAdjustDAO.selectMaterialPending();
        if (pending.isEmpty()) {
            throw new IllegalArgumentException(NOTHING_MESSAGE);
        }
        for (StockScheduleVO row : pending) {
            double counted = nz(row.getEditedQty() != null ? row.getEditedQty() : row.getNewStockQty());
            double finalQty = counted + deltaAfter.getOrDefault(row.getCode(), 0.0);
            Double before = stockAdjustDAO.selectMaterialStock(row.getCode());
            stockAdjustDAO.updateMaterialStock(row.getCode(), finalQty);
            // 엑셀에 창고가 적혀 있었으면 이때 함께 옮긴다
            if (text(row.getWarehouse()) != null) {
                stockAdjustDAO.updateMaterialWarehouse(row.getCode(), row.getWarehouse());
            }
            // 이력에는 날것 값을 적는다(공통 되감기가 새것 - 옛것 을 증감으로 쓴다)
            stockAdjustDAO.applyMaterialSchedule(row.getId(), date, finalQty, before, note);
        }
        return confirmed(pending.size(), date);
    }

    @Override
    public List<StockScheduleVO> listMaterialHistory(String start, String end) throws Exception {
        String from = text(start);
        String to = text(end);
        boolean period = from != null && to != null;
        List<StockScheduleVO> rows = stockAdjustDAO.selectMaterialHistory(period ? from : null, period ? to : null);
        for (StockScheduleVO row : rows) {
            row.setDiff(row.getOldStockQty() != null && row.getNewStockQty() != null ? row.getNewStockQty() - row.getOldStockQty() : null);
        }
        return rows;
    }

    @Override
    public List<MaterialStockVO> listMaterials() throws Exception {
        return stockAdjustDAO.selectMaterials();
    }

    @Override
    public void moveMaterial(String code, MovementRequestVO payload) throws Exception {
        MovementRequestVO request = payload == null ? new MovementRequestVO() : payload;
        String note = text(request.getNote());
        MaterialStockVO material = stockAdjustDAO.selectMaterial(code);
        if (material == null) {
            throw new IllegalArgumentException(MATERIAL_MISSING_MESSAGE);
        }
        String now = now();
        // 적용재고: 계산 없이 이 값으로 바로 바꾼다(차이만큼 입고 또는 출고로 남긴다)
        if (text(request.getSetQty()) != null) {
            Double setQty = toDouble(request.getSetQty());
            if (setQty == null) {
                throw new IllegalArgumentException("적용재고는 숫자여야 합니다");
            }
            double delta = setQty - nz(material.getStockQty());
            stockAdjustDAO.updateMaterialStock(code, setQty);
            stockAdjustDAO.insertMaterialMovement(code, material.getName(), delta > 0 ? delta : 0, delta < 0 ? -delta : 0,
                    note == null ? "적용재고 직접수정" : note, now);
            return;
        }
        double inQty = orZero(request.getInQty());
        double outQty = orZero(request.getOutQty());
        if (inQty == 0 && outQty == 0) {
            throw new IllegalArgumentException("입고, 출고, 적용재고 중 하나는 입력해주세요");
        }
        if (outQty > 0 && note == null) {
            throw new IllegalArgumentException("출고는 사유(비고)를 꼭 적어주세요");
        }
        stockAdjustDAO.addMaterialStockInOut(code, inQty, outQty);
        stockAdjustDAO.insertMaterialMovement(code, material.getName(), inQty, outQty, note, now);
    }

    // ===== 제품 재고조정 =====

    @Override
    public List<StockScheduleVO> listProductSchedule() throws Exception {
        return withTarget(stockAdjustDAO.selectProductSchedule());
    }

    @Override
    public StockUploadResultVO uploadProduct(StockUploadRequestVO payload) throws Exception {
        return stage(payload == null ? null : payload.getRows(), false, null);
    }

    @Override
    public void editProductSchedule(long id, String editedQty) throws Exception {
        Double qty = toDouble(editedQty);
        if (qty == null) {
            throw new IllegalArgumentException(EDIT_NUMBER_MESSAGE);
        }
        if (stockAdjustDAO.updateProductScheduleEdited(id, qty) == 0) {
            throw new IllegalArgumentException(EDIT_MISSING_MESSAGE);
        }
    }

    @Override
    public void cancelProductSchedule(long id) throws Exception {
        stockAdjustDAO.deleteProductSchedule(id);
    }

    @Override
    public int cancelAllProductSchedule() throws Exception {
        return stockAdjustDAO.deleteProductPending();
    }

    // 센 값은 '반영일에 창고에 있던 양' — 제품도 앞날짜 생산·출하가 이미 반영돼 있어 되감을 양(원장 기준)을 더해 넣는다
    @Override
    public StockConfirmResultVO confirmProduct(StockConfirmRequestVO payload, String userName) throws Exception {
        StockConfirmRequestVO request = payload == null ? new StockConfirmRequestVO() : payload;
        String date = text(request.getEffectiveDate());
        if (date == null) {
            throw new IllegalArgumentException(DATE_MESSAGE);
        }
        Map<String, Double> deltaAfter = new HashMap<>();
        for (StockScheduleVO row : stockAdjustDAO.selectProductDeltaAfter(date)) {
            deltaAfter.put(row.getCode(), nz(row.getDiff()));
        }
        List<StockScheduleVO> pending = stockAdjustDAO.selectProductPending();
        if (pending.isEmpty()) {
            throw new IllegalArgumentException(NOTHING_MESSAGE);
        }
        for (StockScheduleVO row : pending) {
            double counted = nz(row.getEditedQty() != null ? row.getEditedQty() : row.getNewStockQty());
            double finalQty = counted + deltaAfter.getOrDefault(row.getCode(), 0.0);
            Double before = stockAdjustDAO.selectProductStock(row.getCode());
            // 재고조정은 '얼마로 맞춘다' 이지만 원장에는 '얼마나 움직였나' 로 남긴다 — 원장을 다 더한 값이 지금 재고와 맞게
            ProductStockMovementVO options = new ProductStockMovementVO();
            options.setMovedOn(date);
            options.setSourceTable("product_stock_schedule");
            options.setSourceId(row.getId());
            options.setNote(before != null ? fmtG(before) + " -> " + fmtG(finalQty) : null);
            options.setCreatedBy(userName); // 2026-10-26 로그인 사번
            inventoryService.moveProductStock(row.getCode(), finalQty - nz(before), "재고조정", options);
            stockAdjustDAO.applyProductSchedule(row.getId(), date, finalQty, before);
        }
        return confirmed(pending.size(), date);
    }

    @Override
    public List<ProductStockMovementVO> listProductHistory(String start, String end, String productCode, String kind) throws Exception {
        return stockAdjustDAO.selectProductHistory(text(start), text(end), text(productCode), text(kind));
    }

    // ===== 창고이동 =====

    @Override
    public WarehouseLookupVO lookupWarehouseMove(String barcode) throws Exception {
        String key = text(barcode);
        if (key == null) {
            throw new IllegalArgumentException("바코드를 찍어주세요");
        }
        String code;
        String foundBarcode = null;
        String lotDate = null;
        WarehouseMoveVO receiving = stockAdjustDAO.selectReceivingByBarcode(key);
        if (receiving != null) {
            code = receiving.getMaterialCode();
            foundBarcode = receiving.getBarcode();
            lotDate = receiving.getReceiveDate();
        } else {
            // 바코드가 아니라 원재료코드를 그대로 찍거나 손으로 넣은 경우 — 로트를 모르니 바코드는 안 남는다
            if (!stockAdjustDAO.existsMaterial(key)) {
                throw new IllegalArgumentException("'" + key + "' 로 찾을 수 있는 입고건이나 원재료가 없어요");
            }
            code = key;
        }
        MaterialStockVO material = stockAdjustDAO.selectMaterial(code);
        if (material == null) {
            throw new IllegalArgumentException(MATERIAL_MISSING_MESSAGE);
        }
        if (material.getUnitWeight() == null || material.getUnitWeight() == 0) {
            throw new IllegalArgumentException(material.getName() + "의 단위중량이 아직 없어요. 기초정보 > 원재료BOM에서 한 봉이 몇 kg 인지 먼저 적어주세요");
        }
        double inWeighing = materialStockSnapshotService.movedOutOfReceiving().getOrDefault(code, 0.0);
        WarehouseLookupVO result = new WarehouseLookupVO();
        result.setMaterialCode(code);
        result.setMaterialName(material.getName());
        result.setBarcode(foundBarcode);
        result.setLotDate(lotDate);
        result.setUnitWeight(material.getUnitWeight());
        result.setBoxQty(material.getBoxQty());
        // 화면 표시용 단위: 2026-10-23 unit 은 공통코드 UNIT 코드라 이름(예: KG)을 넘긴다(비었으면 예전처럼 kg)
        result.setUnit(text(material.getUnitNm()) != null ? material.getUnitNm() : "kg");
        result.setStockQty(nz(material.getStockQty()));
        result.setInMaterialWarehouse(nz(material.getStockQty()) - inWeighing);
        result.setInWeighingWarehouse(inWeighing);
        return result;
    }

    @Override
    public WarehouseMoveResultVO moveWarehouse(WarehouseMoveRequestVO payload, String userName) throws Exception {
        WarehouseMoveRequestVO request = payload == null ? new WarehouseMoveRequestVO() : payload;
        String code = text(request.getMaterialCode());
        int packs = toInt(request.getPackCount());
        if (code == null || packs <= 0) {
            throw new IllegalArgumentException("옮길 품목과 봉수가 필요합니다");
        }
        MaterialStockVO material = stockAdjustDAO.selectMaterial(code);
        if (material == null) {
            throw new IllegalArgumentException(MATERIAL_MISSING_MESSAGE);
        }
        if (material.getUnitWeight() == null || material.getUnitWeight() == 0) {
            throw new IllegalArgumentException(material.getName() + "의 단위중량이 없어 몇 kg 인지 알 수 없어요");
        }
        double qty = material.getUnitWeight() * packs;
        // 자재창고에 있는 것보다 많이 옮길 수는 없다 — 막지 않으면 자재창고가 마이너스로 내려가 두 창고 숫자를 아무도 믿지 않게 된다
        double inMaterial = nz(material.getStockQty()) - materialStockSnapshotService.movedOutOfReceiving().getOrDefault(code, 0.0);
        if (qty > inMaterial + 1e-9) {
            throw new IllegalArgumentException("자재창고에 " + fmtQty(inMaterial) + "밖에 없어요 (" + packs + "봉 = " + fmtQty(qty) + ")");
        }
        String to = text(request.getToWarehouse());
        if (to == null) {
            // 입고창고가 아닌 창고가 하나뿐이면 그리로 보낸다(보통 계량창고)
            List<String> others = stockAdjustDAO.selectOtherWarehouseNames();
            if (others.size() != 1) {
                throw new IllegalArgumentException("어느 창고로 옮길지 골라주세요");
            }
            to = others.get(0);
        }
        WarehouseMoveVO row = new WarehouseMoveVO();
        row.setMaterialCode(code);
        row.setMaterialName(material.getName());
        row.setBarcode(text(request.getBarcode()));
        row.setFromWarehouse(stockAdjustDAO.selectReceivingWarehouseName());
        row.setToWarehouse(to);
        row.setPackCount(packs);
        row.setUnitWeight(material.getUnitWeight());
        row.setQty(qty);
        row.setMovedDate(text(request.getMovedDate()) != null ? text(request.getMovedDate()) : today());
        row.setMovedBy(userName);
        row.setCreatedAt(now());
        stockAdjustDAO.insertWarehouseMove(row);
        WarehouseMoveResultVO result = new WarehouseMoveResultVO();
        result.setQty(qty);
        result.setToWarehouse(to);
        return result;
    }

    @Override
    public List<WarehouseMoveVO> listWarehouseMoves(String date) throws Exception {
        String day = text(date);
        return stockAdjustDAO.selectWarehouseMoves(day == null ? today() : day);
    }

    @Override
    public void cancelWarehouseMove(long id) throws Exception {
        stockAdjustDAO.deleteWarehouseMove(id);
    }

    @Override
    public List<String> listMoveTargets() throws Exception {
        List<String> names = stockAdjustDAO.selectOtherWarehouseNames();
        return names == null ? Collections.<String>emptyList() : names;
    }

    // ===== 도우미 =====

    // 머리줄 칸 이름(2026-10-26). 원재료마스터 엑셀(원재료코드 · 원재료명 · … · 재고)을 그대로 올릴 수 있게 이름으로 찾는다
    static final List<String> CODE_HEADERS = Arrays.asList("원재료코드", "제품코드", "품목코드", "코드");
    static final List<String> NAME_HEADERS = Arrays.asList("원재료명", "부자재명", "제품명", "품목명", "이름");
    static final List<String> QTY_HEADERS = Arrays.asList("재고수량", "재고");

    // 머리줄에서 칸 자리를 찾는다. 앞에 둔 이름을 먼저 본다. 없으면 -1
    static int headerIndex(List<String> header, List<String> names) {
        if (header == null) {
            return -1;
        }
        for (String name : names) {
            for (int i = 0; i < header.size(); i++) {
                if (header.get(i) != null && name.equals(header.get(i).trim())) {
                    return i;
                }
            }
        }
        return -1;
    }

    private static String cell(List<String> row, int index) {
        return index >= 0 && row.size() > index ? row.get(index) : null;
    }

    // 송연 업로드: 2행부터, 코드가 비면 넘기고, 재고수량을 숫자로 못 읽거나 없는 코드면 건너뜀.
    // 2026-10-26 칸은 머리줄 이름으로 찾는다(코드 · 재고 칸을 못 찾으면 예전처럼 첫째 · 둘째 · 넷째 칸)
    private StockUploadResultVO stage(List<List<String>> rows, boolean material, String warehouse) throws Exception {
        int staged = 0;
        int skipped = 0;
        String now = now();
        List<List<String>> list = rows == null ? Collections.<List<String>>emptyList() : rows;
        List<String> header = list.isEmpty() ? null : list.get(0);
        int codeAt = headerIndex(header, CODE_HEADERS);
        int qtyAt = headerIndex(header, QTY_HEADERS);
        int nameAt = headerIndex(header, NAME_HEADERS);
        if (codeAt < 0 || qtyAt < 0) {
            codeAt = 0;
            nameAt = 1;
            qtyAt = 3;
        }
        for (int i = 1; i < list.size(); i++) {
            List<String> row = list.get(i);
            String rawCode = row == null ? null : cell(row, codeAt);
            if (rawCode == null || rawCode.trim().isEmpty()) {
                continue;
            }
            String code = rawCode.trim();
            String name = text(cell(row, nameAt));
            Double qty = toDouble(cell(row, qtyAt));
            if (qty == null) {
                skipped++;
                continue;
            }
            boolean exists = material ? stockAdjustDAO.existsMaterial(code) : stockAdjustDAO.existsProduct(code);
            if (!exists) {
                skipped++;
                continue;
            }
            StockScheduleVO schedule = new StockScheduleVO();
            schedule.setCode(code);
            schedule.setName(name);
            schedule.setNewStockQty(qty);
            schedule.setCreatedAt(now);
            schedule.setWarehouse(warehouse);
            if (material) {
                stockAdjustDAO.insertMaterialSchedule(schedule);
            } else {
                stockAdjustDAO.insertProductSchedule(schedule);
            }
            staged++;
        }
        StockUploadResultVO result = new StockUploadResultVO();
        result.setStaged(staged);
        result.setSkipped(skipped);
        return result;
    }

    private static List<StockScheduleVO> withTarget(List<StockScheduleVO> rows) {
        for (StockScheduleVO row : rows) {
            Double target = row.getEditedQty() != null ? row.getEditedQty() : row.getNewStockQty();
            row.setTargetQty(target);
            row.setDiff(target == null ? null : target - nz(row.getCurrentStockQty()));
        }
        return rows;
    }

    private static StockConfirmResultVO confirmed(int count, String date) {
        StockConfirmResultVO result = new StockConfirmResultVO();
        result.setConfirmed(count);
        result.setEffectiveDate(date);
        return result;
    }

    // 송연 f"{x:g}": 유효숫자 여섯 자리, 끝의 0 은 뗀다(아주 크거나 작으면 지수 표기)
    static String fmtG(double value) {
        if (value == 0) {
            return "0";
        }
        BigDecimal rounded = new BigDecimal(value).round(new MathContext(6, RoundingMode.HALF_EVEN));
        int exponent = rounded.precision() - rounded.scale() - 1;
        if (exponent < -4 || exponent >= 6) {
            String mantissa = rounded.movePointLeft(exponent).stripTrailingZeros().toPlainString();
            return mantissa + "e" + (exponent < 0 ? "-" : "+") + String.format("%02d", Math.abs(exponent));
        }
        return rounded.stripTrailingZeros().toPlainString();
    }

    // 송연 fmt_qty: 10.0 은 '10', 그 밖은 :g
    static String fmtQty(double value) {
        if (value == Math.rint(value) && Math.abs(value) < 1e15) {
            return String.valueOf((long) value);
        }
        return fmtG(value);
    }

    // 송연 josa: 받침에 맞는 조사(은는·이가·을를). 한글로 끝나지 않으면 앞엣것
    static String josa(String word, String pair) {
        if (word == null || word.trim().isEmpty()) {
            return pair.substring(0, 1);
        }
        String w = word.trim();
        char last = w.charAt(w.length() - 1);
        if (last < '가' || last > '힣') {
            return pair.substring(0, 1);
        }
        return (last - 0xAC00) % 28 != 0 ? pair.substring(0, 1) : pair.substring(1, 2);
    }

    // 송연 float(x): 숫자로 못 읽으면 null
    static Double toDouble(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            double parsed = Double.parseDouble(value.trim());
            return Double.isNaN(parsed) || Double.isInfinite(parsed) ? null : parsed;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // 송연 float(x or 0): 비거나 못 읽으면 0
    private static double orZero(String value) {
        Double parsed = toDouble(value);
        return parsed == null ? 0 : parsed;
    }

    // 송연 int(x or 0): 정수로 못 읽으면 0
    private static int toInt(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private static double nz(Double value) {
        return value == null ? 0 : value;
    }

    private static String today() {
        return LocalDate.now(SEOUL).toString();
    }

    private static String now() {
        return LocalDateTime.now(SEOUL).format(CREATED_AT);
    }

    private static String text(Object raw) {
        String value = raw == null ? "" : raw.toString().trim();
        return value.isEmpty() ? null : value;
    }
}
