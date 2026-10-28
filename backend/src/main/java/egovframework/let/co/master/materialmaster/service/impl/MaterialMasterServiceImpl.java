package egovframework.let.co.master.materialmaster.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import egovframework.let.co.master.materialmaster.domain.model.MaterialCreateRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialInfoSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceLogVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceScheduleVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialReplaceRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialSupplierVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialUsageVO;
import egovframework.let.co.master.itemmaster.domain.model.PricingCostsVO;
import egovframework.let.co.master.materialmaster.domain.repository.MaterialMasterDAO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;
import egovframework.let.co.master.materialmaster.service.MaterialMasterService;

/**
 * 기초정보 - 원재료BOM·부자재BOM 서비스 구현 클래스
 * 송연 변환본(CM0001Service 원재료BOM·부자재BOM 부분, 기존 create_material·update_material_info·update_material_price·
 * bulk_replace_material·apply_due_price_schedules)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Service("materialMasterService")
public class MaterialMasterServiceImpl extends EgovAbstractServiceImpl implements MaterialMasterService {

    static final String NAME_REQUIRED_MESSAGE = "원재료명은 필수입니다";
    static final String NOT_FOUND_MESSAGE = "원재료를 찾을 수 없습니다";
    static final String UNIT_MESSAGE = "단위를 다시 골라주세요(공통코드 단위에 없는 값입니다)";
    static final String SUB_CATEGORY_MESSAGE = "부자재 분류를 다시 골라주세요(공통코드 부자재분류에 없는 값입니다)";
    static final String PRICE_MESSAGE = "단가는 숫자여야 합니다";
    static final String USE_YN_MESSAGE = "사용여부는 Y 또는 N 이어야 합니다";
    static final String CODE_RACE_MESSAGE = "코드 생성 중 충돌이 발생했어요. 다시 시도해주세요.";
    static final String REPLACE_REQUIRED_MESSAGE = "교체할 원재료를 선택해주세요";
    static final String REPLACE_SAME_MESSAGE = "같은 원재료로는 교체할 수 없습니다";
    static final String SAME_MATERIAL_MESSAGE = "같은 이름·규격의 원재료가 이미 있어요: ";
    static final String SUPPLIER_NOT_FOUND_MESSAGE = "거래처BOM에 없는 납품업체입니다. 새로고침 후 다시 골라주세요";

    private static final DateTimeFormatter NOW = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final MaterialMasterDAO materialMasterDAO;
    private final ItemMasterDAO itemMasterDAO;

    public MaterialMasterServiceImpl(MaterialMasterDAO materialMasterDAO, ItemMasterDAO itemMasterDAO) {
        this.materialMasterDAO = materialMasterDAO;
        this.itemMasterDAO = itemMasterDAO;
    }

    @Override
    public List<MaterialMasterVO> listMaterials(String q) throws Exception {
        applyDuePriceSchedules();
        List<MaterialMasterVO> rows = materialMasterDAO.selectMaterialList(q == null ? "" : q.trim());
        attachSuppliers(rows);
        return rows;
    }

    @Override
    public List<MaterialSupplierVO> listVendors() throws Exception {
        return materialMasterDAO.selectVendorClients();
    }

    @Override
    public List<MaterialMasterVO> listSameMaterials(String name, String spec, String excludeCode) throws Exception {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            return new ArrayList<>();
        }
        return materialMasterDAO.selectSameMaterials(trimmed, memo(spec), memo(excludeCode));
    }

    // 이름·규격이 같은 원재료가 있으면, 화면에서 '그래도 저장' 확인을 받은 경우(allowDuplicate)만 통과시킨다
    private void checkSameMaterial(String name, String spec, String excludeCode, Object allowDuplicate) throws Exception {
        if (Boolean.TRUE.equals(allowDuplicate) || "true".equals(String.valueOf(allowDuplicate))) {
            return;
        }
        List<MaterialMasterVO> same = listSameMaterials(name, spec, excludeCode);
        if (!same.isEmpty()) {
            StringBuilder message = new StringBuilder(SAME_MATERIAL_MESSAGE);
            for (int i = 0; i < same.size(); i++) {
                MaterialMasterVO m = same.get(i);
                message.append(i == 0 ? "" : ", ").append(m.getName())
                        .append(m.getSpec() == null ? "" : " " + m.getSpec()).append(" (").append(m.getCode()).append(')');
            }
            throw new IllegalArgumentException(message.toString());
        }
    }

    @Override
    public String createMaterial(MaterialCreateRequestVO payload) throws Exception {
        MaterialCreateRequestVO request = payload == null ? new MaterialCreateRequestVO() : payload;
        String name = required(request.getName());
        checkSameMaterial(name, request.getSpec(), null, request.getAllowDuplicate());
        MaterialMasterVO row = new MaterialMasterVO();
        row.setName(name);
        row.setSpec(memo(request.getSpec()));
        row.setUnitPrice(toNumber(request.getUnitPrice()));
        row.setRegUserId(request.getRegUserId()); // 등록자(2026-10-23): 컨트롤러가 로그인 사원 사번으로 채운다
        try {
            materialMasterDAO.insertMaterial(row);
        } catch (DuplicateKeyException ex) {
            throw new IllegalArgumentException(CODE_RACE_MESSAGE);
        }
        if (row.getUnitPrice() != null) {
            materialMasterDAO.insertMaterialPriceLog(row.getCode(), name, now(), null, row.getUnitPrice());
        }
        return row.getCode();
    }

    // 수정자 · 수정일시(2026-10-23). 재고 수량 · 창고 이름 따라가기 · 적용일 자동 단가는 여기를 부르지 않는다
    @Override
    public void markMaterialUpdated(String code, String employeeId) throws Exception {
        if (code == null || code.trim().isEmpty()) {
            return;
        }
        materialMasterDAO.updateMaterialAudit(code.trim(), employeeId);
    }

    // 사용여부(2026-10-23): Y/N 만 받는다. 원재료 창 저장과 따로라 다른 칸은 건드리지 않는다(거래처와 같음)
    @Override
    public void updateMaterialUseYn(String code, String useYn, String employeeId) throws Exception {
        String value = useYn == null ? "" : useYn.trim().toUpperCase();
        if (!"Y".equals(value) && !"N".equals(value)) {
            throw new IllegalArgumentException(USE_YN_MESSAGE);
        }
        String target = code == null ? "" : code.trim();
        if (target.isEmpty() || materialMasterDAO.selectMaterial(target) == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        materialMasterDAO.updateMaterialUseYn(target, value, employeeId);
    }

    // 코드가 안 적힌 옛 레시피 줄은 이름으로 찾을 수밖에 없는데, 같은 이름을 쓰는 원재료가 더 있으면
    // 남의 배합표까지 바뀐다. 그때는 손대지 않고 그 원재료가 몇 개인지 돌려준다(사람이 보고 정한다).

    @Override
    public MaterialInfoSaveResultVO saveMaterialInfo(String code, Map<String, Object> body) throws Exception {
        Map<String, Object> values = body == null ? Collections.<String, Object>emptyMap() : body;
        String name = required(text(values.get("name")));
        // 납품업체는 거래처코드로 받는다(2026-10-23, 예전 거래처 id). 코드로 거래처명을 찾아 두고, 없는 코드면 아무것도 고치지 않고 막는다.
        Object supplierCodes = values.get("supplierCodes");
        List<MaterialSupplierVO> suppliers = supplierCodes instanceof List ? resolveSuppliers((List<?>) supplierCodes) : null;
        MaterialMasterVO current = materialMasterDAO.selectMaterial(code);
        if (current == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        String oldName = current.getName() == null ? "" : current.getName();
        // 이름이나 규격을 바꿔 다른 원재료와 같아지면 확인을 받는다(안 바꾸면 묻지 않는다)
        String newSpec = values.containsKey("spec") ? memo(text(values.get("spec"))) : current.getSpec();
        boolean nameChanged = !normalize(name).equals(normalize(oldName));
        boolean specChanged = !normalize(newSpec).equals(normalize(current.getSpec()));
        if (nameChanged || specChanged) {
            checkSameMaterial(name, newSpec, code, values.get("allowDuplicate"));
        }

        MaterialMasterVO row = new MaterialMasterVO();
        row.setCode(code);
        row.setName(name);
        // 납품업체는 materials.client_code 에 거래처코드 배열('["000001","000002"]')로 넣는다. 목록이 안 왔으면 지금 값 그대로 둔다.
        row.setSupplier(suppliers == null ? current.getSupplier() : supplierCodesText(suppliers));
        row.setSpec(memo(text(values.get("spec"))));
        row.setWarehouse(memo(text(values.get("warehouse"))));
        // 부자재 분류(2026-10-23): 공통코드 SUB_MATERIAL_CATEGORY 의 사용 중 코드만 받는다(비우면 원재료). 안 보냈으면 그대로 둔다
        String subCategory = memo(text(values.get("subCategory")));
        if (values.containsKey("subCategory") && subCategory != null
                && !materialMasterDAO.selectSubCategoryCodes().contains(subCategory)) {
            throw new IllegalArgumentException(SUB_CATEGORY_MESSAGE);
        }
        row.setSubCategory(subCategory);
        // 단위(2026-10-23): 공통코드 UNIT 의 사용 중 코드만 받는다(비우면 비움). 안 보냈으면 그대로 둔다
        String unit = memo(text(values.get("unit")));
        if (values.containsKey("unit") && unit != null && !materialMasterDAO.selectUnitCodes().contains(unit)) {
            throw new IllegalArgumentException(UNIT_MESSAGE);
        }
        row.setUnit(unit);
        row.setAllergens(memo(text(values.get("allergens"))));
        row.setSafetyStock(toNumber(values.get("safetyStock")));
        row.setBaseOrderQty(toNumber(values.get("baseOrderQty")));
        row.setUnitWeight(toNumber(values.get("unitWeight")));
        Double boxQty = toNumber(values.get("boxQty"));
        row.setBoxQty(boxQty == null ? null : (int) Math.round(boxQty));
        materialMasterDAO.updateMaterialInfo(row, values.keySet());

        MaterialInfoSaveResultVO saved = new MaterialInfoSaveResultVO();
        if (!name.equals(oldName)) {
            saved.setRenamedFrom(oldName);
            saved.setCascadedBom(materialMasterDAO.updateBomMaterialName(code, name));
            int recipe = materialMasterDAO.updateRecipeBomMaterialName(code, name);
            if (!oldName.isEmpty()) {
                long nameless = materialMasterDAO.countNamelessRecipeBom(oldName);
                long others = materialMasterDAO.countMaterialsByName(oldName); // 이미 고쳤으므로 남은 것은 다른 원재료
                if (nameless > 0 && others == 0) {
                    recipe += materialMasterDAO.updateNamelessRecipeBom(oldName, name, code);
                } else if (nameless > 0) {
                    saved.setCascadedRecipeSkipped((int) others);
                }
            }
            saved.setCascadedRecipeVersion(recipe);
        }
        return saved;
    }

    // 거래처코드 배열 글자(2026-10-23): ["000001","000002"]. 없으면 null
    static String supplierCodesText(List<MaterialSupplierVO> suppliers) {
        if (suppliers.isEmpty()) {
            return null;
        }
        StringBuilder text = new StringBuilder("[");
        for (int i = 0; i < suppliers.size(); i++) {
            text.append(i == 0 ? "" : ",").append('"').append(suppliers.get(i).getClientCode()).append('"');
        }
        return text.append(']').toString();
    }

    // materials.client_code 가 거래처코드 배열('["000001","000002"]')인지
    static boolean isSupplierCodesText(String value) {
        return value != null && value.replace(" ", "").matches("\\[(\"[0-9]+\"(,\"[0-9]+\")*)?\\]");
    }

    // 거래처코드 목록 → 거래처코드·업체명(같은 코드는 한 번만, 빈 값은 건너뜀). 거래처BOM 에 없는 코드면 막는다.
    private List<MaterialSupplierVO> resolveSuppliers(List<?> codes) throws Exception {
        List<MaterialSupplierVO> result = new ArrayList<>();
        for (Object raw : codes) {
            String clientCode = raw == null ? "" : String.valueOf(raw).trim();
            if (clientCode.isEmpty()) {
                continue;
            }
            boolean seen = false;
            for (MaterialSupplierVO picked : result) {
                seen = seen || clientCode.equals(picked.getClientCode());
            }
            if (seen) {
                continue;
            }
            String clientName = materialMasterDAO.selectClientNameByCode(clientCode);
            if (clientName == null) {
                throw new IllegalArgumentException(SUPPLIER_NOT_FOUND_MESSAGE);
            }
            MaterialSupplierVO supplier = new MaterialSupplierVO();
            supplier.setClientCode(clientCode);
            supplier.setClientName(clientName);
            result.add(supplier);
        }
        return result;
    }

    @Override
    public MaterialPriceSaveResultVO saveMaterialPrice(String code, MaterialPriceRequestVO payload) throws Exception {
        MaterialPriceRequestVO request = payload == null ? new MaterialPriceRequestVO() : payload;
        Double price = toNumber(request.getUnitPrice());
        if (price == null) {
            throw new IllegalArgumentException(PRICE_MESSAGE);
        }
        MaterialMasterVO material = materialMasterDAO.selectMaterial(code);
        if (material == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        String effectiveDate = request.getEffectiveDate() == null ? "" : request.getEffectiveDate().trim();
        MaterialPriceSaveResultVO saved = new MaterialPriceSaveResultVO();
        if (!effectiveDate.isEmpty() && effectiveDate.compareTo(today()) > 0) {
            materialMasterDAO.insertMaterialPriceSchedule(code, material.getName(), price, effectiveDate, now());
            saved.setScheduled(Boolean.TRUE);
            saved.setEffectiveDate(effectiveDate);
            return saved;
        }
        saved.setScheduled(Boolean.FALSE);
        saved.setAffectedProducts(applyMaterialPrice(code, material.getName(), material.getUnitPrice(), price));
        return saved;
    }

    @Override
    public List<MaterialPriceLogVO> listPriceLog(String code) throws Exception {
        return materialMasterDAO.selectMaterialPriceLog(code);
    }

    @Override
    public List<MaterialPriceScheduleVO> listPriceSchedule(String code) throws Exception {
        applyDuePriceSchedules();
        return materialMasterDAO.selectMaterialPriceSchedule(code);
    }

    @Override
    public void cancelPriceSchedule(Long id) throws Exception {
        materialMasterDAO.deleteMaterialPriceSchedule(id);
    }

    @Override
    public List<MaterialUsageVO> listUsage(String code) throws Exception {
        return materialMasterDAO.selectMaterialUsage(code);
    }

    @Override
    public int replaceMaterial(String code, MaterialReplaceRequestVO payload) throws Exception {
        MaterialReplaceRequestVO request = payload == null ? new MaterialReplaceRequestVO() : payload;
        String newCode = request.getNewMaterialCode() == null ? "" : request.getNewMaterialCode().trim();
        if (newCode.isEmpty()) {
            throw new IllegalArgumentException(REPLACE_REQUIRED_MESSAGE);
        }
        if (newCode.equals(code)) {
            throw new IllegalArgumentException(REPLACE_SAME_MESSAGE);
        }
        MaterialMasterVO oldMaterial = materialMasterDAO.selectMaterial(code);
        MaterialMasterVO newMaterial = materialMasterDAO.selectMaterial(newCode);
        if (oldMaterial == null || newMaterial == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        List<String> productCodes = request.getProductCodes() == null || request.getProductCodes().isEmpty()
                ? null : request.getProductCodes();
        List<String> affected = materialMasterDAO.selectBomProductCodesByMaterial(code, productCodes);
        materialMasterDAO.updateBomMaterial(code, newMaterial, productCodes);
        for (String productCode : affected) {
            recalcPricing(productCode);
        }
        return affected.size();
    }

    // 송연 apply_due_price_schedules: 적용일자가 된 예약 단가를 반영한다.
    // 송연은 /api 요청마다 돌렸고, 변환본처럼 원재료BOM 을 볼 때(목록·예약 조회) 돌린다 — 예약을 만든 화면이 곧 이 화면이다.
    @Override
    public void applyDuePriceSchedules() throws Exception {
        for (MaterialPriceScheduleVO due : materialMasterDAO.selectDueMaterialPriceSchedules(today())) {
            MaterialMasterVO material = materialMasterDAO.selectMaterial(due.getMaterialCode());
            applyMaterialPrice(due.getMaterialCode(), due.getMaterialName(),
                    material == null ? null : material.getUnitPrice(), due.getNewPrice());
            materialMasterDAO.markMaterialPriceScheduleApplied(due.getId());
        }
    }

    // 단가를 바꾸고(변경로그 남김) 그 원재료를 쓰는 제품의 배합표·단가표까지 따라 고친다. 영향받은 제품 수.
    private int applyMaterialPrice(String code, String name, Double oldPrice, Double newPrice) throws Exception {
        materialMasterDAO.updateMaterialPrice(code, newPrice);
        materialMasterDAO.insertMaterialPriceLog(code, name, now(), oldPrice, newPrice);
        List<String> affected = materialMasterDAO.selectBomProductCodesByMaterial(code, null);
        materialMasterDAO.updateBomPriceByMaterial(code, newPrice);
        for (String productCode : affected) {
            recalcPricing(productCode);
        }
        return affected.size();
    }

    // 송연 recalc_products_pricing: 배합표 합계를 원재료비로, 원가 항목을 더해 제품단가로 다시 적는다.
    private void recalcPricing(String productCode) throws Exception {
        PricingCostsVO costs = itemMasterDAO.selectPricingCosts(productCode);
        if (costs == null) {
            return;
        }
        BigDecimal materialCost = BigDecimal.valueOf(materialMasterDAO.selectBomAmountSum(productCode));
        BigDecimal total = materialCost;
        for (Double cost : new Double[] {costs.getLossCost(), costs.getMarkupCost(), costs.getLaborCost(),
                costs.getPackagingCost(), costs.getLogisticsCost(), costs.getMargin(), costs.getOtherCost1(),
                costs.getOtherCost2(), costs.getOtherCost3(), costs.getOtherCost4()}) {
            if (cost != null) {
                total = total.add(BigDecimal.valueOf(cost));
            }
        }
        itemMasterDAO.updatePricingMaterialCost(productCode, materialCost.doubleValue(), total.doubleValue());
    }

    // 납품업체는 목록 쿼리에서 거래처와 조인해 업체코드·업체명 배열로 받는다 → 화면 칩 목록으로 짝짓는다.
    // 업체코드 배열이 아닌 옛 값(업체명)은 그 이름 그대로 채운다(업체코드 없음 — 다시 골라 저장하면 배열로 바뀐다).
    @Override
    public void attachSuppliers(List<MaterialMasterVO> rows) {
        for (MaterialMasterVO row : rows) {
            List<MaterialSupplierVO> list = new ArrayList<>();
            String[] codes = row.getSupplierCodes();
            String[] names = row.getSupplierNames();
            for (int i = 0; codes != null && i < codes.length; i++) {
                MaterialSupplierVO supplier = new MaterialSupplierVO();
                supplier.setMaterialCode(row.getCode());
                supplier.setClientCode(codes[i]);
                supplier.setClientName(names != null && i < names.length ? names[i] : null);
                list.add(supplier);
            }
            String legacy = row.getSupplier() == null ? "" : row.getSupplier().trim();
            if (list.isEmpty() && !legacy.isEmpty() && !isSupplierCodesText(legacy)) {
                MaterialSupplierVO old = new MaterialSupplierVO();
                old.setMaterialCode(row.getCode());
                old.setClientName(legacy);
                list.add(old);
            }
            row.setSuppliers(list);
        }
    }

    private static String required(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException(NAME_REQUIRED_MESSAGE);
        }
        return value;
    }

    // 같은 원재료 비교용: 띄어쓰기 없애고 소문자
    private static String normalize(String value) {
        return value == null ? "" : value.replaceAll("\\s", "").toLowerCase();
    }

    private static String text(Object raw) {
        return raw == null ? null : raw.toString();
    }

    private static String memo(String raw) {
        String value = raw == null ? "" : raw.trim();
        return value.isEmpty() ? null : value;
    }

    // 숫자 글자·숫자를 Double 로. 비었거나 숫자가 아니면 null(송연 NumberUtil.toNumber 와 같음)
    static Double toNumber(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number) {
            return ((Number) raw).doubleValue();
        }
        String value = raw.toString().trim();
        if (value.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(value).doubleValue();
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String today() {
        return LocalDate.now(SEOUL).toString();
    }

    private static String now() {
        return LocalDateTime.now(SEOUL).format(NOW);
    }
}
