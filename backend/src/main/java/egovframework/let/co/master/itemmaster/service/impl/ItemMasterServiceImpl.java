package egovframework.let.co.master.itemmaster.service.impl;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.com.cmm.util.KoreanText;
import egovframework.com.cmm.util.SimilarText;
import egovframework.let.co.master.itemmaster.domain.model.BomLineInputVO;
import egovframework.let.co.master.itemmaster.domain.model.BomLineVO;
import egovframework.let.co.master.itemmaster.domain.model.ClientOptionVO;
import egovframework.let.co.master.itemmaster.domain.model.BomLogVO;
import egovframework.let.co.master.itemmaster.domain.model.MaterialCheckVO;
import egovframework.let.co.master.itemmaster.domain.model.MaterialOptionVO;
import egovframework.let.co.master.itemmaster.domain.model.PricingCostsVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductInfoSaveRequestVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductSubMaterialsVO;
import egovframework.let.co.master.itemmaster.domain.model.SubMaterialsSaveRequestVO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;
import egovframework.let.co.master.itemmaster.service.ItemMasterService;

/**
 * 기초정보 - 제품BOM 서비스 구현 클래스
 * 송연 변환본(CM0001Service 제품BOM 부분, 기존 app.py update_product_bom 등)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Service("itemMasterService")
public class ItemMasterServiceImpl extends EgovAbstractServiceImpl implements ItemMasterService {

    static final String PRODUCT_NOT_FOUND = "제품을 찾을 수 없습니다";
    static final String NAME_REQUIRED = "제품명은 필수입니다";
    static final String STORAGE_MESSAGE = "보관방법을 다시 골라주세요(공통코드 보관방법에 없는 값입니다)";
    static final String CLIENT_CODE_MESSAGE = "거래처를 목록에서 다시 골라주세요(사용 중인 거래처가 아닙니다)";
    static final String CLIENT_REQUIRED_MESSAGE = "거래처를 골라주세요(거래처마스터에 등록된 거래처만 저장할 수 있어요)";
    static final String CLIENT_NOT_REGISTERED_MESSAGE = "거래처마스터에 없는 거래처예요. 거래처를 목록에서 다시 골라주세요";

    private static final DateTimeFormatter CHANGED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final ItemMasterDAO itemMasterDAO;
    private final ObjectMapper objectMapper;

    public ItemMasterServiceImpl(ItemMasterDAO itemMasterDAO, ObjectMapper objectMapper) {
        this.itemMasterDAO = itemMasterDAO;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<ProductBomVO> listProducts(boolean includeDiscontinued) throws Exception {
        return itemMasterDAO.selectProductList(includeDiscontinued);
    }

    @Override
    public List<BomLineVO> getBom(String code) throws Exception {
        return itemMasterDAO.selectBom(code);
    }

    // 송연 update_product_info: 제품명 필수, 업체명은 거래처BOM 이름만(원래 붙어 있던 이름은 그대로 둬도 통과)
    @Override
    @Transactional
    public void saveProductInfo(String code, ProductInfoSaveRequestVO payload) throws Exception {
        if (payload == null || !StringUtils.hasText(payload.getName())) {
            throw new IllegalArgumentException(NAME_REQUIRED);
        }
        ProductBomVO product = requireProduct(code);
        String name = payload.getName().trim();
        String storage = resolveStorageCode(payload.getStorage()); // 2026-10-23 공통코드 STORAGE_METHOD 코드
        // 2026-10-23 거래처는 화면이 목록에서 고른 거래처코드를 그대로 저장한다(이름 변환 없음)
        String client = resolveClientCode(payload.getClientCode(), product.getClientCode());
        // 2026-10-27 제품마스터 수정: 거래처는 필수, 거래처마스터에 등록된 거래처만(지금 값을 그대로 두어도 마스터에 없으면 막는다)
        if (client == null) {
            throw new IllegalArgumentException(CLIENT_REQUIRED_MESSAGE);
        }
        if (itemMasterDAO.selectRegisteredClientCode(client) == null) {
            throw new IllegalArgumentException(CLIENT_NOT_REGISTERED_MESSAGE);
        }
        itemMasterDAO.updateProductInfo(code, name, storage, client);
        itemMasterDAO.updatePricingProductName(code, name);
    }

    // 수정자 · 수정일시(2026-10-23). 재고 수량 변동 · 라벨등록은 수정으로 치지 않아 여기를 부르지 않는다
    @Override
    @Transactional
    public void markProductUpdated(String code, String employeeId) throws Exception {
        if (code == null || code.trim().isEmpty()) {
            return;
        }
        itemMasterDAO.updateProductAudit(code.trim(), employeeId);
    }

    // 송연 set_product_discontinued: 재고가 남아 있으면 못 내려놓는다(재고가 화면에서 조용히 사라진다)
    @Override
    @Transactional
    public void setDiscontinued(String code, boolean discontinued, String note, String userName) throws Exception {
        ProductBomVO product = requireProduct(code);
        double stock = product.getStockQty() == null ? 0 : product.getStockQty();
        if (discontinued && stock != 0) {
            throw new IllegalArgumentException("'" + product.getName() + "' 은 재고가 " + formatG(stock)
                    + " 남아있어 사용안함으로 바꿀 수 없습니다. 재고를 0으로 맞춘 뒤에 해주세요.");
        }
        ProductBomVO row = new ProductBomVO();
        row.setCode(code);
        row.setDiscontinued(discontinued ? 1 : 0);
        if (discontinued) {
            row.setDiscontinuedAt(now());
            row.setDiscontinuedBy(userName);
            row.setDiscontinuedNote(StringUtils.hasText(note) ? note.trim() : null);
        }
        itemMasterDAO.updateProductDiscontinued(row);
    }

    // 송연 update_product_bom: 통째로 다시 적고, 단가표의 원재료비·제품단가를 다시 계산하고, 변경로그를 남긴다
    @Override
    @Transactional
    public double saveBom(String code, List<BomLineInputVO> input) throws Exception {
        requireProduct(code);
        List<BomLineVO> oldBom = itemMasterDAO.selectBom(code);
        // 이 제품이 원래 물고 있던 코드. 이름이 겹치는 원재료가 있어도 저장 한 번에 다른 코드로 갈아타지 않게 한다.
        Map<String, String> preferCodes = new LinkedHashMap<>();
        for (BomLineVO line : oldBom) {
            if (line.getMaterialName() != null && line.getMaterialCode() != null) {
                preferCodes.putIfAbsent(line.getMaterialName(), line.getMaterialCode());
            }
        }
        itemMasterDAO.deleteBom(code);
        List<BomLineVO> resolved = resolveBom(input, preferCodes);
        BigDecimal materialCost = BigDecimal.ZERO;
        for (BomLineVO line : resolved) {
            if (line.getAmountPerKg() != null) {
                materialCost = materialCost.add(BigDecimal.valueOf(line.getAmountPerKg()));
            }
            itemMasterDAO.insertBomLine(code, line);
        }
        // 단가표가 있으면 원재료비와 제품단가(원가 항목 합)를 다시 계산한다
        PricingCostsVO costs = itemMasterDAO.selectPricingCosts(code);
        if (costs != null) {
            BigDecimal total = materialCost;
            for (Double cost : new Double[] {costs.getLossCost(), costs.getMarkupCost(), costs.getLaborCost(),
                    costs.getPackagingCost(), costs.getLogisticsCost(), costs.getMargin(), costs.getOtherCost1(),
                    costs.getOtherCost2(), costs.getOtherCost3(), costs.getOtherCost4()}) {
                if (cost != null) {
                    total = total.add(BigDecimal.valueOf(cost));
                }
            }
            itemMasterDAO.updatePricingMaterialCost(code, materialCost.doubleValue(), total.doubleValue());
        }
        itemMasterDAO.insertBomLog(code, now(), writeBom(oldBom), writeBom(resolved));
        return materialCost.doubleValue();
    }

    @Override
    public List<BomLogVO> getBomLog(String code) throws Exception {
        List<BomLogVO> logs = itemMasterDAO.selectBomLog(code);
        for (BomLogVO log : logs) {
            log.setOldBom(readBom(log.getOldBomJson()));
            log.setNewBom(readBom(log.getNewBomJson()));
        }
        return logs;
    }

    @Override
    public ProductSubMaterialsVO getSubMaterials(String code) throws Exception {
        ProductSubMaterialsVO row = itemMasterDAO.selectSubMaterials(code);
        if (row == null) {
            // 부자재 칸이 모두 비어 있으면 MyBatis 가 null 을 준다 — 제품이 있으면 빈 부자재로 돌려준다
            // (송연 변환본은 이때 '제품을 찾을 수 없습니다'가 나고 화면이 조용히 넘겼다)
            requireProduct(code);
            return new ProductSubMaterialsVO();
        }
        return row;
    }

    // 송연 update_product_sub_materials: 부자재 칸에는 그 분류로 등록된 원재료만 넣을 수 있다
    // (필름칸에 파우치를 넣어두면 생산할 때마다 엉뚱한 재고가 줄고, 한참 뒤에야 드러난다)
    @Override
    @Transactional
    public void saveSubMaterials(String code, SubMaterialsSaveRequestVO payload) throws Exception {
        requireProduct(code);
        SubMaterialsSaveRequestVO request = payload == null ? new SubMaterialsSaveRequestVO() : payload;
        ProductSubMaterialsVO row = new ProductSubMaterialsVO();
        row.setPouchNetWeightKg(request.getPouchNetWeightKg());
        row.setPouchLengthM(request.getPouchLengthM());
        row.setPouchPerUnit(request.getPouchPerUnit());
        row.setFilmMaterialCode(resolveSubMaterial(request.getFilmMaterial(), "필름"));
        row.setPouchMaterialCode(resolveSubMaterial(request.getPouchMaterial(), "파우치"));
        row.setBoxMaterialCode(resolveSubMaterial(request.getBoxMaterial(), "박스"));
        itemMasterDAO.updateSubMaterials(code, row);
    }

    @Override
    public List<MaterialOptionVO> listMaterials() throws Exception {
        return itemMasterDAO.selectMaterialOptions();
    }

    @Override
    public List<String> listClientNames() throws Exception {
        return itemMasterDAO.selectClientNames();
    }

    // 송연 materials/check: 정확히 같으면 exact, 아니면 비슷한 이름 최대 4개(유사도 0.45 이상)
    @Override
    public List<MaterialCheckVO> checkMaterials(List<String> names) throws Exception {
        List<String> all = new ArrayList<>();
        for (MaterialOptionVO option : itemMasterDAO.selectMaterialOptions()) {
            all.add(option.getName());
        }
        List<MaterialCheckVO> result = new ArrayList<>();
        for (String raw : names == null ? Collections.<String>emptyList() : names) {
            String name = raw == null ? "" : raw.trim();
            boolean exact = all.contains(name);
            MaterialCheckVO check = new MaterialCheckVO();
            check.setInput(name);
            check.setExact(exact);
            check.setSuggestions(exact ? Collections.<String>emptyList() : SimilarText.closeMatches(name, all, 4, 0.45));
            result.add(check);
        }
        return result;
    }

    private ProductBomVO requireProduct(String code) throws Exception {
        ProductBomVO product = StringUtils.hasText(code) ? itemMasterDAO.selectProduct(code) : null;
        if (product == null) {
            throw new IllegalArgumentException(PRODUCT_NOT_FOUND);
        }
        return product;
    }

    // 화면에서 직접 넣은 단가가 우선, 없으면 원재료BOM 단가. 적용단가 = 배합비율(%) / 100 × 단가
    @Override
    public List<BomLineVO> resolveBomLines(List<BomLineInputVO> input) throws Exception {
        return resolveBom(input, Collections.<String, String>emptyMap());
    }

    @Override
    public List<ClientOptionVO> listClientOptions() throws Exception {
        return itemMasterDAO.selectClientOptions();
    }

    @Override
    public String resolveClientCode(String raw, String current) throws Exception {
        String value = StringUtils.hasText(raw) ? raw.trim() : null;
        if (value == null) {
            return null;
        }
        if (value.equals(current)) {
            return value;
        }
        if (itemMasterDAO.selectActiveClientCode(value) == null) {
            throw new IllegalArgumentException(CLIENT_CODE_MESSAGE);
        }
        return value;
    }

    @Override
    public String resolveStorageCode(String raw) throws Exception {
        String value = StringUtils.hasText(raw) ? raw.trim() : null;
        if (value == null) {
            return null;
        }
        if (!itemMasterDAO.selectStorageCodes().contains(value)) {
            throw new IllegalArgumentException(STORAGE_MESSAGE);
        }
        return value;
    }

    @Override
    public String resolveRegisteredClient(String raw) throws Exception {
        return resolveClient(raw, null);
    }

    private List<BomLineVO> resolveBom(List<BomLineInputVO> input, Map<String, String> preferCodes) throws Exception {
        List<BomLineVO> rows = new ArrayList<>();
        List<BomLineInputVO> list = input == null ? Collections.<BomLineInputVO>emptyList() : input;
        for (int i = 0; i < list.size(); i++) {
            BomLineInputVO line = list.get(i);
            String name = line == null || line.getMaterialName() == null ? "" : line.getMaterialName().trim();
            if (name.isEmpty()) {
                continue;
            }
            BigDecimal ratio = line.getRatioPercent() == null ? null : BigDecimal.valueOf(line.getRatioPercent());
            String wantCode = StringUtils.hasText(line.getMaterialCode())
                    ? line.getMaterialCode().trim() : preferCodes.get(name);
            MaterialOptionVO material = itemMasterDAO.selectMaterialByName(name, wantCode);
            BigDecimal unitPrice = line.getUnitPrice() == null ? null : BigDecimal.valueOf(line.getUnitPrice());
            if (unitPrice == null && material != null && material.getUnitPrice() != null) {
                unitPrice = BigDecimal.valueOf(material.getUnitPrice());
            }
            BigDecimal amount = ratio != null && unitPrice != null ? ratio.movePointLeft(2).multiply(unitPrice) : null;
            BomLineVO row = new BomLineVO();
            row.setMaterialCode(material == null ? null : material.getCode());
            row.setMaterialName(name);
            row.setRatioPercent(ratio == null ? null : ratio.movePointLeft(2).doubleValue());
            row.setUnitPricePerKg(unitPrice == null ? null : unitPrice.doubleValue());
            row.setAmountPerKg(amount == null ? null : amount.doubleValue());
            row.setRank(i + 1);
            rows.add(row);
        }
        return rows;
    }

    // 송연 resolve_registered_client: 거래처BOM 이름만 받는다(수주→생산→출하→매출이 이 이름 하나로 이어진다)
    private String resolveClient(String raw, String current) throws Exception {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.equals(current)) {
            return current;
        }
        String found = itemMasterDAO.selectClientName(trimmed);
        if (found != null) {
            return found;
        }
        throw new IllegalArgumentException("'" + trimmed + "' 은 거래처BOM에 없는 거래처입니다."
                + clientHint(trimmed, itemMasterDAO.selectClientNames())
                + " 없는 곳이면 공통관리 > 기초정보 > 거래처BOM 에서 먼저 등록해주세요.");
    }

    // (주)·주식회사·띄어쓰기 등을 떼고 같으면 그 이름, 아니면 가장 비슷한 이름(0.7 이상)을 안내
    static String clientHint(String name, List<String> allNames) {
        Map<String, String> byKey = new LinkedHashMap<>();
        for (String n : allNames) {
            byKey.putIfAbsent(normalizeClient(n), n);
        }
        String key = normalizeClient(name);
        if (byKey.containsKey(key)) {
            return " 혹시 '" + byKey.get(key) + "' 인가요?";
        }
        List<String> close = SimilarText.closeMatches(key, new ArrayList<>(byKey.keySet()), 1, 0.7);
        return close.isEmpty() ? "" : " 혹시 '" + byKey.get(close.get(0)) + "' 인가요?";
    }

    static String normalizeClient(String s) {
        return (s == null ? "" : s).replaceAll("\\((주|유|재|사)\\)|주식회사|유한회사|농업회사법인", "")
                .replaceAll("[\\s.\\-·]", "");
    }

    private String resolveSubMaterial(String raw, String want) throws Exception {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            return null;
        }
        MaterialOptionVO material = itemMasterDAO.selectMaterialByCodeOrName(value);
        if (material == null) {
            throw new IllegalArgumentException(want + KoreanText.josa(want, "로") + " 지정한 '" + value + "'"
                    + KoreanText.josa(value, "을를") + " 원재료BOM에서 찾을 수 없습니다");
        }
        // 2026-10-23 sub_category 는 공통코드 코드라, 공통코드 이름(' — ' 앞부분)으로 견준다
        if (!want.equals(material.getSubCategoryNm())) {
            throw new IllegalArgumentException("'" + material.getName() + "'" + KoreanText.josa(material.getName(), "은는")
                    + " " + want + KoreanText.josa(want, "로") + " 등록된 부자재가 아닙니다. "
                    + "원재료BOM에서 부자재 분류를 " + want + KoreanText.josa(want, "로") + " 바꿔주세요.");
        }
        return material.getCode();
    }

    // 변경로그 JSON 은 송연 기존 파이썬·변환본과 같은 snake_case 이름으로 적는다(세 프로그램이 같은 표를 같이 읽는다)
    private String writeBom(List<BomLineVO> bom) throws JsonProcessingException {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (BomLineVO line : bom) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("material_code", line.getMaterialCode());
            row.put("material_name", line.getMaterialName());
            row.put("ratio_percent", line.getRatioPercent());
            row.put("unit_price_per_kg", line.getUnitPricePerKg());
            row.put("amount_per_kg", line.getAmountPerKg());
            row.put("rank", line.getRank());
            rows.add(row);
        }
        return objectMapper.writeValueAsString(rows);
    }

    List<BomLineVO> readBom(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            List<Map<String, Object>> rows = objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() { });
            List<BomLineVO> result = new ArrayList<>();
            for (Map<String, Object> row : rows) {
                BomLineVO line = new BomLineVO();
                line.setMaterialCode(text(pick(row, "material_code", "materialCode")));
                line.setMaterialName(text(pick(row, "material_name", "materialName")));
                line.setRatioPercent(number(pick(row, "ratio_percent", "ratioPercent")));
                line.setUnitPricePerKg(number(pick(row, "unit_price_per_kg", "unitPricePerKg")));
                line.setAmountPerKg(number(pick(row, "amount_per_kg", "amountPerKg")));
                Double rank = number(row.get("rank"));
                line.setRank(rank == null ? null : rank.intValue());
                result.add(line);
            }
            return result;
        } catch (JsonProcessingException ex) {
            return Collections.emptyList();
        }
    }

    private static Object pick(Map<String, Object> row, String snake, String camel) {
        return row.containsKey(snake) ? row.get(snake) : row.get(camel);
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    private static Double number(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value == null || value.toString().trim().isEmpty()) {
            return null;
        }
        try {
            return Double.valueOf(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String now() {
        return LocalDateTime.now(SEOUL).format(CHANGED_AT);
    }

    // 송연 NumberUtil.formatG: 파이썬 '%g' 와 같은 표시(유효숫자 6자리)
    static String formatG(double value) {
        if (value == 0) {
            return "0";
        }
        BigDecimal rounded = new BigDecimal(value).round(new MathContext(6));
        int exponent = rounded.precision() - rounded.scale() - 1;
        if (exponent < -4 || exponent >= 6) {
            BigDecimal mantissa = rounded.movePointLeft(exponent).stripTrailingZeros();
            return mantissa.toPlainString() + (exponent < 0 ? "e-" : "e+") + String.format("%02d", Math.abs(exponent));
        }
        return rounded.stripTrailingZeros().toPlainString();
    }
}
