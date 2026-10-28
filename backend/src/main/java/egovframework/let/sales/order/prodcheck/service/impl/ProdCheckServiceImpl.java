package egovframework.let.sales.order.prodcheck.service.impl;

import java.text.Collator;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckByProductVO;
import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckDataVO;
import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckLineVO;
import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckRequestVO;
import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckResultVO;
import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckRowVO;
import egovframework.let.sales.order.prodcheck.domain.repository.ProdCheckDAO;
import egovframework.let.sales.order.prodcheck.service.ProdCheckService;

/**
 * 영업관리 - 생산가능확인 서비스 구현 클래스
 * 송연 변환본(SA0006Service, 기존 production_feasibility · bom_requirements · material_delta_after)과 같은 규칙.
 * 필요량 = 생산량 × 배합비율, 그 날짜 재고 = 지금 재고 - 그 날짜 뒤의 증감(입고 + 조정 - 생산 사용).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("prodCheckService")
public class ProdCheckServiceImpl extends EgovAbstractServiceImpl implements ProdCheckService {

    static final String NO_PRODUCT_MESSAGE = "제품을 하나 이상 골라주세요";
    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final ProdCheckDAO prodCheckDAO;

    public ProdCheckServiceImpl(ProdCheckDAO prodCheckDAO) {
        this.prodCheckDAO = prodCheckDAO;
    }

    // 배합비가 없는 제품은 안 보여준다. 골라봐야 필요량이 안 나온다.
    @Override
    public List<String> listProducts() throws Exception {
        List<String> names = new ArrayList<>();
        for (ProdCheckDataVO product : prodCheckDAO.selectBomProducts()) {
            names.add(product.display());
        }
        names.sort(Collator.getInstance(Locale.KOREAN));
        return names;
    }

    @Override
    public ProdCheckResultVO check(ProdCheckRequestVO payload) throws Exception {
        ProdCheckRequestVO request = payload == null ? new ProdCheckRequestVO() : payload;
        String date = request.getDate() == null || request.getDate().trim().isEmpty()
                ? LocalDate.now(ZoneId.of("Asia/Seoul")).toString() : request.getDate().trim();
        List<ProdCheckLineVO> input = request.getLines() == null ? Collections.<ProdCheckLineVO>emptyList() : request.getLines();
        if (input.isEmpty()) {
            throw new IllegalArgumentException(NO_PRODUCT_MESSAGE);
        }
        List<ProdCheckLineVO> lines = new ArrayList<>();
        for (ProdCheckLineVO raw : input) {
            String name = raw == null || raw.getProduct() == null ? "" : raw.getProduct().trim();
            double qty = parseQty(raw == null ? null : raw.getQty());
            if (qty <= 0) {
                throw new IllegalArgumentException("'" + name + "' 의 생산수량을 적어주세요");
            }
            ProdCheckLineVO line = new ProdCheckLineVO();
            line.setProduct(name);
            line.setQtyKg(qty);
            lines.add(line);
        }

        List<ProdCheckDataVO> allProducts = prodCheckDAO.selectProductNameSpecs();
        List<String> unknown = new ArrayList<>();
        Map<String, Need> total = requirements(lines, allProducts, unknown);
        // 제품 하나씩도 미리 편다
        List<Map<String, Need>> perNeeds = new ArrayList<>();
        List<Boolean> perUnknown = new ArrayList<>();
        for (ProdCheckLineVO line : lines) {
            List<String> oneUnknown = new ArrayList<>();
            perNeeds.add(requirements(Collections.singletonList(line), allProducts, oneUnknown));
            perUnknown.add(!oneUnknown.isEmpty());
        }
        Map<String, ProdCheckDataVO> stocks = new HashMap<>();
        for (ProdCheckDataVO material : prodCheckDAO.selectMaterialStocks()) {
            stocks.put(material.getCode(), material);
        }
        Map<String, Double> deltaAfter = deltaAfter(date);

        List<ProdCheckRowVO> rows = toRows(total, stocks, deltaAfter, perNeeds);
        // 제품 하나씩도 따로 낸다. 합계만 보면 어느 제품 때문에 모자란지 모른다.
        List<ProdCheckByProductVO> byProduct = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            List<ProdCheckRowVO> oneRows = toRows(perNeeds.get(i), stocks, deltaAfter, null);
            int shortageCount = shortageCount(oneRows);
            ProdCheckByProductVO one = new ProdCheckByProductVO();
            one.setProduct(lines.get(i).getProduct());
            one.setQty(lines.get(i).getQtyKg());
            one.setRows(oneRows);
            one.setShortageCount(shortageCount);
            one.setOk(shortageCount == 0 && !perUnknown.get(i));
            byProduct.add(one);
        }
        int shortageCount = shortageCount(rows);
        ProdCheckResultVO result = new ProdCheckResultVO();
        result.setDate(date);
        result.setLines(lines);
        result.setRows(rows);
        result.setByProduct(byProduct);
        result.setUnknownProducts(unknown);
        result.setShortageCount(shortageCount);
        result.setOk(shortageCount == 0 && unknown.isEmpty());
        return result;
    }

    private static final class Need {
        private final String name;
        private final double qty;

        Need(String name, double qty) {
            this.name = name;
            this.qty = qty;
        }
    }

    // 송연 bom_requirements: 제품별 생산량을 원재료별 필요량으로 펴서 더한다(필요량 = 생산량 × 비율).
    // 배합비를 못 찾은 제품(제품이 없거나 배합비가 비었음)은 unknown 에 담는다.
    private Map<String, Need> requirements(List<ProdCheckLineVO> lines, List<ProdCheckDataVO> products, List<String> unknown) throws Exception {
        Map<String, Need> need = new LinkedHashMap<>();
        for (ProdCheckLineVO line : lines) {
            if (line.getQtyKg() == null || line.getQtyKg() <= 0 || line.getProduct().isEmpty()) {
                continue;
            }
            String code = null;
            for (ProdCheckDataVO product : products) {
                if (product.display().equals(line.getProduct())) {
                    code = product.getCode();
                    break;
                }
            }
            if (code == null) {
                unknown.add(line.getProduct());
                continue;
            }
            int counted = 0;
            for (ProdCheckDataVO bom : prodCheckDAO.selectBomLines(code)) {
                if (bom.getMaterialCode() == null || bom.getMaterialCode().isEmpty() || bom.getRatioPercent() == null) {
                    continue;
                }
                Need slot = need.get(bom.getMaterialCode());
                double qty = (slot == null ? 0 : slot.qty) + line.getQtyKg() * bom.getRatioPercent();
                need.put(bom.getMaterialCode(), new Need(slot == null ? bom.getMaterialName() : slot.name, qty));
                counted++;
            }
            if (counted == 0) {
                unknown.add(line.getProduct());
            }
        }
        return need;
    }

    // 송연 material_delta_after: 그 날짜 뒤의 원재료 증감. 그 날짜 재고 = 지금 재고 - 이 값
    private Map<String, Double> deltaAfter(String date) throws Exception {
        Map<String, Double> delta = new HashMap<>();
        add(delta, prodCheckDAO.selectReceivingAfter(date), 1);
        add(delta, prodCheckDAO.selectUsageAfter(date), -1);
        add(delta, prodCheckDAO.selectMovementAfter(date), 1);
        add(delta, prodCheckDAO.selectAdjustmentAfter(date), 1);
        return delta;
    }

    private static void add(Map<String, Double> delta, List<ProdCheckDataVO> rows, int sign) {
        for (ProdCheckDataVO d : rows) {
            if (d.getCode() == null || d.getQty() == null || d.getQty() == 0) {
                continue;
            }
            delta.merge(d.getCode(), sign * d.getQty(), Double::sum);
        }
    }

    // 원재료 표에 없는 코드는 재고 0 으로 본다(없는 것을 넉넉하다고 답하지 않는다). 모자란 것을 위로.
    private static List<ProdCheckRowVO> toRows(Map<String, Need> need, Map<String, ProdCheckDataVO> stocks,
            Map<String, Double> deltaAfter, List<Map<String, Need>> perNeeds) {
        List<ProdCheckRowVO> rows = new ArrayList<>();
        for (Map.Entry<String, Need> entry : need.entrySet()) {
            String code = entry.getKey();
            Need info = entry.getValue();
            ProdCheckDataVO m = stocks.get(code);
            Double delta = deltaAfter.get(code);
            double stock = m == null ? 0 : (m.getStockQty() == null ? 0 : m.getStockQty()) - (delta == null ? 0 : delta);
            List<Double> per = null;
            if (perNeeds != null) {
                per = new ArrayList<>();
                for (Map<String, Need> one : perNeeds) {
                    per.add(one.containsKey(code) ? one.get(code).qty : 0.0);
                }
            }
            ProdCheckRowVO row = new ProdCheckRowVO();
            row.setCode(code);
            row.setName(m != null && m.getName() != null ? m.getName() : info.name);
            row.setSpec(m == null ? null : m.getSpec());
            row.setKnown(m != null);
            row.setNeedQty(info.qty);
            row.setStockQty(stock);
            row.setAfterQty(stock - info.qty);
            row.setShortage(Math.max(0, info.qty - stock));
            row.setPer(per);
            rows.add(row);
        }
        rows.sort(Comparator.<ProdCheckRowVO>comparingInt(r -> r.getShortage() > 0 ? 0 : 1)
                .thenComparingDouble(r -> -r.getShortage())
                .thenComparing(r -> r.getName() == null ? "" : r.getName()));
        return rows;
    }

    private static int shortageCount(List<ProdCheckRowVO> rows) {
        int count = 0;
        for (ProdCheckRowVO row : rows) {
            if (row.getShortage() > 0) {
                count++;
            }
        }
        return count;
    }

    // 송연 parse_qty_number: '1,000kg' → 1000. 숫자가 없으면 0
    static double parseQty(String value) {
        if (value == null) {
            return 0;
        }
        Matcher matcher = QTY.matcher(value.replace(",", ""));
        if (!matcher.find()) {
            return 0;
        }
        try {
            return Double.parseDouble(matcher.group());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }
}
