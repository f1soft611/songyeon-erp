package egovframework.let.pu.order.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pu.order.domain.model.PurchaseOrderVO;

/**
 * 구매관리 - 발주관리 데이터 접근 클래스 (송연 material_purchase_order · material_receiving · materials)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Repository("purchaseOrderDAO")
public class PurchaseOrderDAO extends EgovAbstractMapper {

    /** 조건은 null 이면 거르지 않는다. received 는 "0"(미입고만)·"1"(입고완료만)·null */
    public List<PurchaseOrderVO> selectOrders(String date, String start, String end, String clientQ, String materialQ, String received) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("date", date);
        params.put("start", start);
        params.put("end", end);
        params.put("clientQ", clientQ);
        params.put("materialQ", materialQ);
        params.put("received", received);
        return selectList("PurchaseOrderDAO.selectOrders", params);
    }

    public String selectMaterialName(String code) throws Exception {
        return selectOne("PurchaseOrderDAO.selectMaterialName", code);
    }

    /** 2026-10-26 거래처마스터의 사용 중인 매입 거래처 이름 → 거래처코드. 아니면 null */
    public String selectVendorCodeByName(String name) throws Exception {
        return selectOne("PurchaseOrderDAO.selectVendorCodeByName", name);
    }

    public int insertOrder(PurchaseOrderVO order) throws Exception {
        return insert("PurchaseOrderDAO.insertOrder", order);
    }

    public int countReceiving(long id) throws Exception {
        return selectOne("PurchaseOrderDAO.countReceiving", id);
    }

    public int deleteOrder(long id) throws Exception {
        return delete("PurchaseOrderDAO.deleteOrder", id);
    }
}
