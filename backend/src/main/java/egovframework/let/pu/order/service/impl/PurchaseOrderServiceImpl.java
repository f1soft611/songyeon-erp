package egovframework.let.pu.order.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.pu.order.domain.model.PurchaseOrderBulkRequestVO;
import egovframework.let.pu.order.domain.model.PurchaseOrderItemVO;
import egovframework.let.pu.order.domain.model.PurchaseOrderVO;
import egovframework.let.pu.order.domain.repository.PurchaseOrderDAO;
import egovframework.let.pu.order.service.PurchaseOrderService;

/**
 * 구매관리 - 발주관리 서비스 구현 클래스 (송연 app.py list_purchase_orders · register_purchase_order_bulk · cancel_purchase_order 를 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Service("purchaseOrderService")
public class PurchaseOrderServiceImpl extends EgovAbstractServiceImpl implements PurchaseOrderService {

    static final String VENDOR_MESSAGE = "거래처마스터에 등록된 매입 거래처가 아닙니다: ";
    static final String MATERIAL_MESSAGE = "원재료마스터에 등록된(사용 중인) 원재료가 아닙니다: ";
    static final String RECEIVED_MESSAGE = "이미 입고 처리된 발주는 삭제할 수 없습니다. 먼저 연결된 입고 내역을 취소해주세요.";
    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final PurchaseOrderDAO purchaseOrderDAO;

    public PurchaseOrderServiceImpl(PurchaseOrderDAO purchaseOrderDAO) {
        this.purchaseOrderDAO = purchaseOrderDAO;
    }

    @Override
    public List<PurchaseOrderVO> listOrders(String date, String start, String end, String clientQ, String materialQ, String received) throws Exception {
        String from = blankToNull(start);
        String to = blankToNull(end);
        // 기간은 시작·끝이 다 있을 때만 쓴다(송연과 같음)
        boolean period = from != null && to != null;
        String flag = blankToNull(received);
        return purchaseOrderDAO.selectOrders(blankToNull(date), period ? from : null, period ? to : null,
                blankToNull(clientQ), blankToNull(materialQ), "0".equals(flag) || "1".equals(flag) ? flag : null);
    }

    // 수불대장에서 넘어온 발주는 품목마다 자기 날짜칸을 갖는다(그 날짜에 필요한 양).
    // 발주등록 창에서 넘어온 것은 위쪽의 발주일 하나를 다 같이 쓴다.
    @Override
    public int registerBulk(PurchaseOrderBulkRequestVO request) throws Exception {
        PurchaseOrderBulkRequestVO body = request == null ? new PurchaseOrderBulkRequestVO() : request;
        String date = trim(body.getOrderDate());
        List<PurchaseOrderItemVO> items = body.getItems();
        boolean anyItemDate = false;
        if (items != null) {
            for (PurchaseOrderItemVO item : items) {
                if (!trim(item.getOrderDate()).isEmpty()) {
                    anyItemDate = true;
                    break;
                }
            }
        }
        if (date.isEmpty() && !anyItemDate) {
            throw new IllegalArgumentException("발주일이 필요합니다");
        }
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("등록할 품목이 없습니다");
        }
        String source = trim(body.getSource());
        String now = LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT);
        // 2026-10-26 등록된 거래처 · 품목만 발주한다. 하나라도 아니면 한 건도 넣지 않고 알린다(먼저 다 확인)
        List<PurchaseOrderVO> orders = new ArrayList<>();
        for (PurchaseOrderItemVO item : items) {
            String clientName = trim(item.getClientName());
            if (clientName.isEmpty()) {
                continue; // 거래처 없는 품목은 건너뜀(품목별로 거래처가 필수)
            }
            Double qty = toDouble(item.getQty());
            if (qty == null) {
                continue;
            }
            String clientCode = purchaseOrderDAO.selectVendorCodeByName(clientName); // 2026-10-26 거래처코드로 저장
            if (clientCode == null) {
                throw new IllegalArgumentException(VENDOR_MESSAGE + clientName);
            }
            String code = trim(item.getMaterialCode());
            String name = purchaseOrderDAO.selectMaterialName(code);
            if (name == null) {
                throw new IllegalArgumentException(MATERIAL_MESSAGE + (code.isEmpty() ? "(코드 없음)" : code));
            }
            String itemDate = trim(item.getOrderDate());
            String needDate = trim(item.getNeedDate());
            PurchaseOrderVO order = new PurchaseOrderVO();
            order.setMaterialCode(code);
            order.setMaterialName(name);
            order.setQty(qty);
            order.setOrderDate(itemDate.isEmpty() ? date : itemDate);
            order.setCreatedAt(now);
            order.setClientName(clientName);
            order.setClientCode(clientCode);
            order.setSource(source.isEmpty() ? null : source);
            order.setNeedDate(needDate.isEmpty() ? null : needDate);
            orders.add(order);
        }
        for (PurchaseOrderVO order : orders) {
            purchaseOrderDAO.insertOrder(order);
        }
        return orders.size();
    }

    @Override
    public void cancel(long id) throws Exception {
        if (purchaseOrderDAO.countReceiving(id) > 0) {
            throw new IllegalArgumentException(RECEIVED_MESSAGE);
        }
        purchaseOrderDAO.deleteOrder(id);
    }

    // 송연 float(qty): 숫자로 못 읽으면 null(그 품목을 건너뛴다)
    private static Double toDouble(String value) {
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

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
