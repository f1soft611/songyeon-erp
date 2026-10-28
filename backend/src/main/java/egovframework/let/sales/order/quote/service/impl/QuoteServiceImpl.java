package egovframework.let.sa.quote.service.impl;

import java.math.BigDecimal;
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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.co.master.itemmaster.domain.model.MaterialOptionVO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;
import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.sa.quote.domain.model.QuoteBomLineVO;
import egovframework.let.sa.quote.domain.model.QuoteSaveRequestVO;
import egovframework.let.sa.quote.domain.model.QuoteVO;
import egovframework.let.sa.quote.domain.repository.QuoteDAO;
import egovframework.let.sa.quote.service.QuoteCostCalculator;
import egovframework.let.sa.quote.service.QuoteService;

/**
 * 영업관리 - 견적 서비스 구현 클래스
 * 송연 변환본(SA0003Service, 기존 create_quote · update_quote · compute_cost_fields)과 같은 규칙.
 * 배합비는 입력 원본 그대로 quotes.bom_json 에 남긴다. 송연(파이썬)과 같은 DB 를 같이 쓰므로
 * 송연과 같은 모양(material_name · ratio_percent · unit_price · material_code)으로 적고 읽는다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("quoteService")
public class QuoteServiceImpl extends EgovAbstractServiceImpl implements QuoteService {

    static final String NAME_REQUIRED_MESSAGE = "제품명은 필수입니다";
    static final String NOT_FOUND_MESSAGE = "견적을 찾을 수 없습니다";
    static final String CONFIRMED_MESSAGE = "이미 확정된 견적은 수정할 수 없습니다";

    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final QuoteDAO quoteDAO;
    private final ItemMasterDAO itemMasterDAO;
    private final ItemMasterService itemMasterService;
    private final ObjectMapper objectMapper;

    public QuoteServiceImpl(QuoteDAO quoteDAO, ItemMasterDAO itemMasterDAO, ItemMasterService itemMasterService,
            ObjectMapper objectMapper) {
        this.quoteDAO = quoteDAO;
        this.itemMasterDAO = itemMasterDAO;
        this.itemMasterService = itemMasterService;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<QuoteVO> listQuotes() throws Exception {
        return quoteDAO.selectQuoteList();
    }

    @Override
    public QuoteVO getQuote(long quoteId) throws Exception {
        QuoteVO quote = quoteDAO.selectQuote(quoteId);
        if (quote == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        quote.setBom(readBom(quote.getBomJson()));
        return quote;
    }

    @Override
    public QuoteVO createQuote(QuoteSaveRequestVO payload) throws Exception {
        QuoteSaveRequestVO request = payload == null ? new QuoteSaveRequestVO() : payload;
        String name = request.getProductName() == null ? "" : request.getProductName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException(NAME_REQUIRED_MESSAGE);
        }
        // 2026-10-23 거래처는 화면이 목록에서 고른 거래처코드를 그대로 저장한다(사용 중 거래처만, 비우면 없음)
        String clientCode = itemMasterService.resolveClientCode(request.getClientCode(), null);
        QuoteVO quote = computed(request);
        quote.setProductName(name);
        quote.setClientCode(clientCode);
        quote.setStatus("draft");
        quote.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT));
        quoteDAO.insertQuote(quote);
        return quote;
    }

    // 송연 update_quote 와 같이 제품명·거래처 검사는 하지 않는다(화면에서 제품명은 막는다)
    @Override
    public QuoteVO updateQuote(long quoteId, QuoteSaveRequestVO payload) throws Exception {
        QuoteSaveRequestVO request = payload == null ? new QuoteSaveRequestVO() : payload;
        String status = quoteDAO.selectQuoteStatus(quoteId);
        if (status == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        if ("confirmed".equals(status)) {
            throw new IllegalArgumentException(CONFIRMED_MESSAGE);
        }
        // 2026-10-23 거래처코드: 지금 견적의 코드는 그대로 두고(사용안함이 돼도), 바꾸면 사용 중 거래처만
        QuoteVO current = quoteDAO.selectQuote(quoteId);
        String clientCode = itemMasterService.resolveClientCode(request.getClientCode(), current == null ? null : current.getClientCode());
        QuoteVO quote = computed(request);
        quote.setQuoteId(quoteId);
        quote.setProductName(request.getProductName());
        quote.setClientCode(clientCode);
        quoteDAO.updateQuote(quote);
        return quote;
    }

    @Override
    public void deleteQuote(long quoteId) throws Exception {
        quoteDAO.deleteQuote(quoteId);
    }

    // 송연 compute_cost_fields: 원재료비 → 고정마진 → 로스 → 나머지 원가 합계. 확정단가가 있으면 그 값이 견적단가.
    private QuoteVO computed(QuoteSaveRequestVO r) throws Exception {
        double materialCost = materialCost(r.getBom());
        QuoteCostCalculator.Result cost = QuoteCostCalculator.compute(materialCost, r);
        QuoteVO q = new QuoteVO();
        q.setSpec(r.getSpec());
        q.setProductType(r.getProductType());
        q.setStorage(itemMasterService.resolveStorageCode(r.getStorage())); // 2026-10-23 공통코드 STORAGE_METHOD 코드
        q.setNote(r.getNote());
        q.setBomJson(writeBom(r.getBom()));
        q.setMaterialCost(materialCost);
        q.setMarkupRate(r.getMarkupRate());
        q.setMarkupCost(cost.getMarkupCost() == null ? 0d : cost.getMarkupCost());
        q.setLossRate(r.getLossRate());
        q.setLossCost(cost.getLossCost() == null ? 0d : cost.getLossCost());
        q.setLaborCost(r.getLaborCost());
        q.setPackagingCost(r.getPackagingCost());
        q.setLogisticsCost(r.getLogisticsCost());
        q.setMargin(r.getMargin());
        q.setOtherCost1(r.getOtherCost1());
        q.setOtherCost1Note(r.getOtherCost1Note());
        q.setOtherCost2(r.getOtherCost2());
        q.setOtherCost2Note(r.getOtherCost2Note());
        q.setOtherCost3(r.getOtherCost3());
        q.setOtherCost3Note(r.getOtherCost3Note());
        q.setOtherCost4(r.getOtherCost4());
        q.setOtherCost4Note(r.getOtherCost4Note());
        q.setCurrentPrice(r.getCurrentPrice());
        q.setTotalPrice(r.getCurrentPrice() != null ? r.getCurrentPrice() : cost.getCostSum());
        return q;
    }

    // 송연 resolve_bom 의 원재료비: Σ(배합비율/100 × 단가). 화면에서 넣은 단가가 없으면 원재료 등록 단가.
    private double materialCost(List<QuoteBomLineVO> bom) throws Exception {
        BigDecimal sum = BigDecimal.ZERO;
        for (QuoteBomLineVO line : bom == null ? Collections.<QuoteBomLineVO>emptyList() : bom) {
            String name = line == null || line.getMaterialName() == null ? "" : line.getMaterialName().trim();
            if (name.isEmpty()) {
                continue;
            }
            Double unitPrice = line.getUnitPrice();
            if (unitPrice == null) {
                String code = line.getMaterialCode() == null || line.getMaterialCode().trim().isEmpty() ? null : line.getMaterialCode().trim();
                MaterialOptionVO material = itemMasterDAO.selectMaterialByName(name, code);
                if (material != null) {
                    unitPrice = material.getUnitPrice();
                }
            }
            if (line.getRatioPercent() != null && unitPrice != null) {
                sum = sum.add(BigDecimal.valueOf(line.getRatioPercent()).movePointLeft(2).multiply(BigDecimal.valueOf(unitPrice)));
            }
        }
        return sum.doubleValue();
    }

    // 송연과 같은 모양으로 적는다: [{"material_name", "ratio_percent", "unit_price", "material_code"(있을 때만)}]
    String writeBom(List<QuoteBomLineVO> bom) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (QuoteBomLineVO line : bom == null ? Collections.<QuoteBomLineVO>emptyList() : bom) {
            if (line == null) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("material_name", line.getMaterialName());
            row.put("ratio_percent", line.getRatioPercent());
            row.put("unit_price", line.getUnitPrice());
            if (line.getMaterialCode() != null && !line.getMaterialCode().isEmpty()) {
                row.put("material_code", line.getMaterialCode());
            }
            rows.add(row);
        }
        try {
            return objectMapper.writeValueAsString(rows);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("배합비를 저장할 수 없습니다");
        }
    }

    // 송연(파이썬)이 적은 것도 읽는다: 배합비율·단가가 글자("18.69")로 들어 있을 수 있다
    List<QuoteBomLineVO> readBom(String json) {
        if (json == null || json.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> rows;
        try {
            rows = objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() { });
        } catch (JsonProcessingException ex) {
            return Collections.emptyList();
        }
        List<QuoteBomLineVO> lines = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (row == null) {
                continue;
            }
            QuoteBomLineVO line = new QuoteBomLineVO();
            line.setMaterialName(text(row.get("material_name")));
            line.setRatioPercent(number(row.get("ratio_percent")));
            line.setUnitPrice(number(row.get("unit_price")));
            line.setMaterialCode(text(row.get("material_code")));
            lines.add(line);
        }
        return lines;
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    private static Double number(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        String text = value == null ? "" : value.toString().trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Double.valueOf(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
