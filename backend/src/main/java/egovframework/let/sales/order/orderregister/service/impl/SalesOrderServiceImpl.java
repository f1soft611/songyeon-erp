package egovframework.let.sales.order.orderregister.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.sales.order.orderregister.domain.model.OrderProductVO;
import egovframework.let.sales.order.orderregister.domain.model.SalesOrderVO;
import egovframework.let.sales.order.orderregister.domain.repository.SalesOrderDAO;
import egovframework.let.sales.order.orderregister.service.SalesOrderService;

/**
 * 영업관리 - 수주등록 서비스 구현 클래스
 * 송연 변환본(SA0004Service, 기존 create_sales_order · resolve_order_shipping · resolve_sales_client · resolve_product_code)과 같은 규칙.
 * 거래처BOM 에 없는 이름 안내는 기초정보 제품BOM 과 같은 것을 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("salesOrderService")
public class SalesOrderServiceImpl extends EgovAbstractServiceImpl implements SalesOrderService {

    static final String DATE_REQUIRED_MESSAGE = "날짜가 필요합니다";
    static final String NOT_FOUND_MESSAGE = "수주 항목을 찾을 수 없습니다";
    static final String QTY_MESSAGE = "수량은 숫자로 적어주세요";
    static final String IMPORTED_DELETE_MESSAGE = "생산확정 · 출하등록에서 가져간 수주는 지울 수 없습니다";
    static final String CLIENT_REQUIRED_MESSAGE = "거래처를 입력해주세요.";
    static final String CLIENT_CODE_MESSAGE = "거래처코드가 있는 거래처를 골라주세요";
    static final String PRODUCT_MESSAGE = "제품마스터에 등록된 품목을 골라주세요";
    static final String SHIPPING_REQUIRED_MESSAGE = "물류출고일을 정하거나 '재고생산' 에 체크해주세요. "
            + "둘 중 하나가 있어야 나중에 출하에서 이 건을 찾을 수 있어요.";

    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final SalesOrderDAO salesOrderDAO;
    private final ItemMasterService itemMasterService;

    public SalesOrderServiceImpl(SalesOrderDAO salesOrderDAO, ItemMasterService itemMasterService) {
        this.salesOrderDAO = salesOrderDAO;
        this.itemMasterService = itemMasterService;
    }

    @Override
    public List<SalesOrderVO> listOrders(String orderDate) throws Exception {
        return salesOrderDAO.selectOrderList(orderDate == null ? "" : orderDate.trim());
    }

    @Override
    public List<String> listSalesClientNames() throws Exception {
        return salesOrderDAO.selectSalesClientNames();
    }

    @Override
    public List<OrderProductVO> listProductCandidates() throws Exception {
        return salesOrderDAO.selectProductCandidates();
    }

    @Override
    public Long createOrder(SalesOrderVO request) throws Exception {
        SalesOrderVO payload = request == null ? new SalesOrderVO() : request;
        String date = payload.getOrderDate() == null ? "" : payload.getOrderDate().trim();
        if (date.isEmpty()) {
            throw new IllegalArgumentException(DATE_REQUIRED_MESSAGE);
        }
        SalesOrderVO order = toRecord(payload);
        order.setOrderDate(date);
        Integer max = salesOrderDAO.selectMaxSortOrder(date);
        order.setSortOrder((max == null ? 0 : max) + 1);
        order.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT));
        salesOrderDAO.insertOrder(order);
        return order.getId();
    }

    @Override
    public void updateOrder(long id, SalesOrderVO request) throws Exception {
        SalesOrderVO order = toRecord(request == null ? new SalesOrderVO() : request);
        order.setId(id);
        // 옆자리에서 그 줄을 지운 뒤 저장하면 고친 줄이 없다. 성공이라고 답하지 않는다.
        if (salesOrderDAO.updateOrder(order) == 0) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
    }

    @Override
    // 2026-10-23 가져간 수주는 지우지 않는다(화면에서 막아도 서버에서 한 번 더). 없는 수주면 성공이라 하지 않는다
    public void deleteOrder(long id) throws Exception {
        Integer imported = salesOrderDAO.selectOrderImported(id);
        if (imported == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        if (imported == 1) {
            throw new IllegalArgumentException(IMPORTED_DELETE_MESSAGE);
        }
        if (salesOrderDAO.deleteOrder(id) == 0) {
            throw new IllegalArgumentException(IMPORTED_DELETE_MESSAGE); // 그 사이 가져갔다
        }
    }

    // 송연 resolve_order_shipping + resolve_sales_client + resolve_product_code
    private SalesOrderVO toRecord(SalesOrderVO r) throws Exception {
        boolean stock = r.getIsStockProduction() != null && r.getIsStockProduction() != 0;
        String logisticsDate = null;
        if (!stock) {
            logisticsDate = blankToNull(r.getLogisticsDate());
            if (logisticsDate == null) {
                throw new IllegalArgumentException(SHIPPING_REQUIRED_MESSAGE);
            }
        }
        SalesOrderVO order = new SalesOrderVO();
        order.setClientName(resolveSalesClient(r.getClientName()));
        // 2026-10-26 sales_order 에는 코드만 남는다. 코드로 못 바꾸는 거래처 · 품목은 저장하면 사라지므로 막는다
        order.setClientCode(requireClientCode(order.getClientName()));
        order.setProductName(r.getProductName());
        order.setProductCode(requireProductCode(r.getProductName(), r.getSpec(), r.getProductCode()));
        order.setOrderQty(qtyOf(r.getOrderQty())); // 2026-10-23 숫자만(쉼표는 뺀다, 비우면 없음)
        order.setNote(r.getNote());
        order.setProductionDate(r.getProductionDate() == null || r.getProductionDate().isEmpty() ? null : r.getProductionDate());
        order.setLogisticsDate(logisticsDate); // 재고생산이면 화면에 남은 옛 날짜가 와도 비운다
        order.setIsStockProduction(stock ? 1 : 0);
        return order;
    }

    // 수량(2026-10-23): 숫자만 받는다. 쉼표는 빼고, 비우면 null
    static String qtyOf(String raw) {
        String value = raw == null ? "" : raw.replace(",", "").trim();
        if (value.isEmpty()) {
            return null;
        }
        if (!value.matches("[0-9]+(\\.[0-9]+)?")) {
            throw new IllegalArgumentException(QTY_MESSAGE);
        }
        return value;
    }

    // 필수, 거래처BOM 에 있어야 하고 분류에 '매출' 이 들어 있어야 한다. 거래처BOM 의 철자로 돌려준다.
    @Override
    public String resolveSalesClient(String raw) throws Exception {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException(CLIENT_REQUIRED_MESSAGE);
        }
        String name = itemMasterService.resolveRegisteredClient(trimmed);
        String type = salesOrderDAO.selectClientType(name);
        if (type == null || !type.contains("매출")) {
            throw new IllegalArgumentException("'" + trimmed + "' 은 매입거래처로 등록되어 있어 수주를 받을 수 없습니다. "
                    + "거래처BOM에서 분류를 '매출' 또는 '매입+매출' 로 바꿔주세요.");
        }
        return name;
    }

    // 제품명(과 규격)으로 제품코드를 찾는다. 하나로 정해지지 않으면 null.
    // 화면은 품목을 '이름(규격)' 한 덩어리로 보내므로 그 모양도 알아듣는다.
    @Override
    public String resolveProductCode(String name, String spec, String given) throws Exception {
        if (given != null && !given.trim().isEmpty()) {
            String code = salesOrderDAO.selectProductCode(given.trim());
            if (code != null) {
                return code;
            }
        }
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (spec != null && !spec.isEmpty()) {
            List<String> bySpec = salesOrderDAO.selectProductCodesByNameAndSpec(trimmed, spec);
            if (bySpec.size() == 1) {
                return bySpec.get(0);
            }
        }
        List<String> byName = salesOrderDAO.selectProductCodesByName(trimmed);
        if (byName.size() == 1) {
            return byName.get(0);
        }
        List<String> byDisplay = new ArrayList<>();
        for (OrderProductVO product : salesOrderDAO.selectProductNameSpecs()) {
            if (trimmed.equals(product.getDisplay())) {
                byDisplay.add(product.getCode());
            }
        }
        return byDisplay.size() == 1 ? byDisplay.get(0) : null;
    }

    @Override
    public String requireClientCode(String clientName) throws Exception {
        String code = clientName == null ? null : salesOrderDAO.selectClientCodeByName(clientName);
        if (code == null) {
            throw new IllegalArgumentException(CLIENT_CODE_MESSAGE);
        }
        return code;
    }

    @Override
    public String requireProductCode(String name, String spec, String given) throws Exception {
        String code = resolveProductCode(name, spec, given);
        if (code == null && name != null && !name.trim().isEmpty()) {
            throw new IllegalArgumentException(PRODUCT_MESSAGE);
        }
        return code;
    }

    private static String blankToNull(String raw) {
        String value = raw == null ? "" : raw.trim();
        return value.isEmpty() ? null : value;
    }
}
