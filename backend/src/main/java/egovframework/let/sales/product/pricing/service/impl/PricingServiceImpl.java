package egovframework.let.sales.product.pricing.service.impl;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.sales.product.pricing.domain.model.PricingBomLineVO;
import egovframework.let.sales.product.pricing.domain.model.PricingVO;
import egovframework.let.sales.product.pricing.domain.repository.PricingDAO;
import egovframework.let.sales.product.pricing.service.PricingService;

/**
 * 영업관리 - 단가관리 서비스 구현 클래스
 * 송연 변환본(SA0002Service, 기존 /api/pricing · update_pricing)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("pricingService")
public class PricingServiceImpl extends EgovAbstractServiceImpl implements PricingService {

    static final String NOT_FOUND_MESSAGE = "단가표를 찾을 수 없습니다";
    static final String NO_FIELDS_MESSAGE = "고칠 항목이 없습니다";
    static final String CLIENT_NOT_FOUND_MESSAGE = "거래처마스터에 없거나 사용하지 않는 거래처예요. 거래처를 다시 골라주세요";

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    // 송연 update_pricing 의 simple_fields 중 숫자 칸·글자 칸(이 목록에 있는 키만 그대로 저장)
    private static final Set<String> NUMBER_FIELDS = new HashSet<>(Arrays.asList("laborCost", "packagingCost",
            "logisticsCost", "margin", "otherCost1", "otherCost2", "otherCost3", "otherCost4", "currentPrice"));
    private static final Set<String> TEXT_FIELDS = new HashSet<>(Arrays.asList("otherCost1Note", "otherCost2Note",
            "otherCost3Note", "otherCost4Note", "productType"));

    private final PricingDAO pricingDAO;

    public PricingServiceImpl(PricingDAO pricingDAO) {
        this.pricingDAO = pricingDAO;
    }

    @Override
    public List<PricingVO> listPricing(String q) throws Exception {
        return pricingDAO.selectPricingList(q == null ? "" : q.trim());
    }

    @Override
    public PricingVO getPricing(String productCode) throws Exception {
        PricingVO pricing = pricingDAO.selectPricing(productCode);
        if (pricing == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        return pricing;
    }

    @Override
    public List<PricingBomLineVO> listPricingBom(String productCode) throws Exception {
        return pricingDAO.selectPricingBom(productCode);
    }

    @Override
    public void updatePricing(String productCode, Map<String, Object> body) throws Exception {
        Map<String, Object> values = body == null ? Collections.<String, Object>emptyMap() : body;
        PricingVO current = getPricing(productCode);
        BigDecimal materialCost = current.getMaterialCost() == null ? BigDecimal.ZERO : BigDecimal.valueOf(current.getMaterialCost());
        BigDecimal markupCost = current.getMarkupCost() == null ? null : BigDecimal.valueOf(current.getMarkupCost());

        PricingVO row = new PricingVO();
        row.setProductCode(productCode);
        Set<String> fields = new HashSet<>();
        if (values.containsKey("markupRate")) {
            BigDecimal rate = toNumber(values.get("markupRate"));
            markupCost = rate == null ? null : materialCost.multiply(rate).divide(HUNDRED);
            row.setMarkupRate(rate == null ? null : rate.doubleValue());
            row.setMarkupCost(markupCost == null ? null : markupCost.doubleValue());
            fields.add("markupRate");
        }
        if (values.containsKey("lossRate")) {
            BigDecimal rate = toNumber(values.get("lossRate"));
            BigDecimal base = materialCost.add(markupCost == null ? BigDecimal.ZERO : markupCost);
            row.setLossRate(rate == null ? null : rate.doubleValue());
            row.setLossCost(rate == null ? null : base.multiply(rate).divide(HUNDRED).doubleValue());
            fields.add("lossRate");
        }
        for (String field : NUMBER_FIELDS) {
            if (values.containsKey(field)) {
                BigDecimal number = toNumber(values.get(field));
                setNumber(row, field, number == null ? null : number.doubleValue());
                fields.add(field);
            }
        }
        for (String field : TEXT_FIELDS) {
            if (values.containsKey(field)) {
                Object value = values.get(field);
                setText(row, field, value == null ? null : value.toString());
                fields.add(field);
            }
        }
        // 거래처(2026-10-28): 팝업에서 고른 거래처코드. 사용 중 거래처만 받고, 지금 값은 그대로 둘 수 있으며, 비우면 비운다
        if (values.containsKey("clientCode")) {
            Object raw = values.get("clientCode");
            String clientCode = raw == null ? "" : raw.toString().trim();
            if (!clientCode.isEmpty() && !clientCode.equals(current.getClientCode())
                    && pricingDAO.selectActiveClientCode(clientCode) == null) {
                throw new IllegalArgumentException(CLIENT_NOT_FOUND_MESSAGE);
            }
            row.setClientCode(clientCode.isEmpty() ? null : clientCode);
            fields.add("clientCode");
        }
        if (fields.isEmpty()) {
            throw new IllegalArgumentException(NO_FIELDS_MESSAGE);
        }
        pricingDAO.updatePricingFields(row, fields);
        pricingDAO.updatePricingTotal(productCode);
    }

    private static void setNumber(PricingVO row, String field, Double value) {
        switch (field) {
            case "laborCost": row.setLaborCost(value); break;
            case "packagingCost": row.setPackagingCost(value); break;
            case "logisticsCost": row.setLogisticsCost(value); break;
            case "margin": row.setMargin(value); break;
            case "otherCost1": row.setOtherCost1(value); break;
            case "otherCost2": row.setOtherCost2(value); break;
            case "otherCost3": row.setOtherCost3(value); break;
            case "otherCost4": row.setOtherCost4(value); break;
            case "currentPrice": row.setCurrentPrice(value); break;
            default: break;
        }
    }

    private static void setText(PricingVO row, String field, String value) {
        switch (field) {
            case "otherCost1Note": row.setOtherCost1Note(value); break;
            case "otherCost2Note": row.setOtherCost2Note(value); break;
            case "otherCost3Note": row.setOtherCost3Note(value); break;
            case "otherCost4Note": row.setOtherCost4Note(value); break;
            case "productType": row.setProductType(value); break;
            default: break;
        }
    }

    // 송연 NumberUtil.toNumber: 숫자·숫자 글자 → 수, 비었거나 숫자가 아니면 null
    static BigDecimal toNumber(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number) {
            return new BigDecimal(raw.toString());
        }
        String value = raw.toString().trim();
        if (value.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
