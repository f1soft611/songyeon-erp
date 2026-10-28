package egovframework.let.sales.product.productregister.service.impl;

import java.math.BigDecimal;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.co.master.itemmaster.domain.model.BomLineVO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;
import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.sales.product.productregister.domain.model.ProductRegisterRequestVO;
import egovframework.let.sales.product.productregister.domain.model.ProductRegisterVO;
import egovframework.let.sales.product.productregister.domain.repository.ProductRegisterDAO;
import egovframework.let.sales.product.productregister.service.ProductRegisterService;
import egovframework.let.sales.order.quote.domain.model.QuoteCostsVO;
import egovframework.let.sales.order.quote.service.QuoteCostCalculator;

/**
 * 영업관리 - 제품등록 서비스 구현 클래스
 * 송연 변환본(SA0001Service.registerProduct)과 같은 규칙. 배합비 계산·거래처 확인은 기초정보 제품BOM 과 같은 것을 쓴다.
 * 견적에서 '확정' 으로 넘어온 경우(quoteId) 견적의 원가 항목을 단가표에 반영하고 같은 트랜잭션에서 견적을 확정한다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("productRegisterService")
public class ProductRegisterServiceImpl extends EgovAbstractServiceImpl implements ProductRegisterService {

    static final String NAME_REQUIRED_MESSAGE = "제품명은 필수입니다";
    static final String NOT_FOUND_MESSAGE = "제품을 찾을 수 없습니다";
    static final String HAS_STOCK_MESSAGE = "재고가 있는 제품은 삭제할 수 없어요. 제품마스터에서 사용안함으로 바꿔주세요";
    static final String IN_USE_MESSAGE = "이미 수주 · 생산 · 출하 등에 쓰인 제품이라 삭제할 수 없어요. 제품마스터에서 사용안함으로 바꿔주세요";
    static final String QUOTE_NOT_CONFIRMABLE_MESSAGE = "견적을 찾을 수 없거나 이미 확정된 견적입니다. 견적 목록을 다시 확인해주세요.";

    private final ProductRegisterDAO productRegisterDAO;
    private final ItemMasterDAO itemMasterDAO;
    private final ItemMasterService itemMasterService;

    public ProductRegisterServiceImpl(ProductRegisterDAO productRegisterDAO, ItemMasterDAO itemMasterDAO,
            ItemMasterService itemMasterService) {
        this.productRegisterDAO = productRegisterDAO;
        this.itemMasterDAO = itemMasterDAO;
        this.itemMasterService = itemMasterService;
    }

    @Override
    public ProductRegisterVO registerProduct(ProductRegisterRequestVO payload) throws Exception {
        ProductRegisterRequestVO request = payload == null ? new ProductRegisterRequestVO() : payload;
        String name = request.getProductName() == null ? "" : request.getProductName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException(NAME_REQUIRED_MESSAGE);
        }
        // 거래처는 거래처BOM 에 있는 이름만 받는다(약칭이 들어가면 그 제품으로 수주를 넣을 때 막힌다)
        // 2026-10-23 거래처는 화면이 목록에서 고른 거래처코드를 그대로 저장한다(사용 중 거래처만, 이름 변환 없음)
        String clientCode = itemMasterService.resolveClientCode(request.getClientCode(), null);
        List<BomLineVO> lines = itemMasterService.resolveBomLines(request.getBom());

        ProductRegisterVO product = new ProductRegisterVO();
        product.setProductName(name);
        product.setSpec(memo(request.getSpec()));
        product.setStorage(itemMasterService.resolveStorageCode(request.getStorage())); // 2026-10-23 공통코드 STORAGE_METHOD 코드
        product.setClientCode(clientCode);
        product.setProductType(memo(request.getProductType()));
        product.setRegUserId(request.getRegUserId());
        productRegisterDAO.insertProduct(product); // 발번한 코드가 product.productCode 에 채워진다

        BigDecimal materialCost = BigDecimal.ZERO;
        for (BomLineVO line : lines) {
            if (line.getAmountPerKg() != null) {
                materialCost = materialCost.add(BigDecimal.valueOf(line.getAmountPerKg()));
            }
            itemMasterDAO.insertBomLine(product.getProductCode(), line);
        }
        product.setMaterialCost(materialCost.doubleValue());
        fillPricing(product, request.getQuoteId() == null ? null : request.getQuoteCosts());
        productRegisterDAO.insertPricing(product);
        // 견적 확정: 0줄이면(없거나 이미 확정) 예외로 제품·배합비·단가표까지 모두 취소된다
        if (request.getQuoteId() != null && productRegisterDAO.updateQuoteConfirmed(request.getQuoteId(), product.getProductCode()) == 0) {
            throw new IllegalArgumentException(QUOTE_NOT_CONFIRMABLE_MESSAGE);
        }
        return product;
    }

    @Override
    public void deleteProduct(String productCode) throws Exception {
        String code = productCode == null ? "" : productCode.trim();
        if (code.isEmpty() || !productRegisterDAO.existsProduct(code)) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        Double stock = productRegisterDAO.selectProductStockQty(code);
        if (stock != null && stock != 0d) {
            throw new IllegalArgumentException(HAS_STOCK_MESSAGE);
        }
        if (productRegisterDAO.countProductUsage(code) > 0) {
            throw new IllegalArgumentException(IN_USE_MESSAGE);
        }
        // 견적에서 확정해 만든 제품이면 그 견적을 가견적으로 돌린다(견적 화면에서 다시 고쳐 확정할 수 있게)
        productRegisterDAO.revertConfirmedQuotes(code);
        productRegisterDAO.deleteProductBom(code);
        productRegisterDAO.deleteProductBomLog(code);
        productRegisterDAO.deleteProductPricing(code);
        productRegisterDAO.deleteProduct(code);
    }

    // 새 제품의 단가표. 보통은 로스·고정마진 0, 제품단가 = 원재료비.
    // 견적 확정이면 송연 update_pricing 규칙으로 견적의 원가 항목을 반영한다:
    // 고정마진 = 원재료비 × 율/100, 로스 = (원재료비 + 고정마진) × 율/100, 제품단가 = 모든 원가 항목의 합(확정단가는 따로 저장만).
    static void fillPricing(ProductRegisterVO p, QuoteCostsVO q) {
        double materialCost = p.getMaterialCost() == null ? 0 : p.getMaterialCost();
        if (q == null) {
            p.setLossCost(0d);
            p.setMarkupCost(0d);
            p.setTotalPrice(materialCost);
            return;
        }
        QuoteCostCalculator.Result cost = QuoteCostCalculator.compute(materialCost, q);
        p.setMarkupRate(q.getMarkupRate());
        p.setMarkupCost(cost.getMarkupCost());
        p.setLossRate(q.getLossRate());
        p.setLossCost(cost.getLossCost());
        p.setLaborCost(q.getLaborCost());
        p.setPackagingCost(q.getPackagingCost());
        p.setLogisticsCost(q.getLogisticsCost());
        p.setMargin(q.getMargin());
        p.setOtherCost1(q.getOtherCost1());
        p.setOtherCost1Note(q.getOtherCost1Note());
        p.setOtherCost2(q.getOtherCost2());
        p.setOtherCost2Note(q.getOtherCost2Note());
        p.setOtherCost3(q.getOtherCost3());
        p.setOtherCost3Note(q.getOtherCost3Note());
        p.setOtherCost4(q.getOtherCost4());
        p.setOtherCost4Note(q.getOtherCost4Note());
        p.setCurrentPrice(q.getCurrentPrice());
        p.setTotalPrice(cost.getCostSum());
    }

    private static String memo(String raw) {
        String value = raw == null ? "" : raw.trim();
        return value.isEmpty() ? null : value;
    }
}
