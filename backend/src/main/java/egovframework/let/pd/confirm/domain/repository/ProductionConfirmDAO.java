package egovframework.let.pd.confirm.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pd.confirm.domain.model.MaterialLineVO;
import egovframework.let.pd.confirm.domain.model.ProductionOrderVO;
import egovframework.let.pd.confirm.domain.model.ProductionScheduleVO;

/**
 * 생산관리 - 생산확정 데이터 접근 클래스
 * (송연 production_schedule · production_material_usage · production_material_substitution · materials 재고 · sales_order · logistics_schedule)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("productionConfirmDAO")
public class ProductionConfirmDAO extends EgovAbstractMapper {

    public List<ProductionScheduleVO> selectSchedule(String date) throws Exception {
        return selectList("ProductionConfirmDAO.selectSchedule", date);
    }

    /** 한 건(실생산량·출하확정 포함). 없으면 null. */
    public ProductionScheduleVO selectScheduleRow(long id) throws Exception {
        return selectOne("ProductionConfirmDAO.selectScheduleRow", id);
    }

    public Integer selectMaxSortOrder(String date) throws Exception {
        return selectOne("ProductionConfirmDAO.selectMaxSortOrder", date);
    }

    /** 같은 날·같은 품목의 로트번호들(exceptId 는 빼고) */
    public List<String> selectLotNos(String date, String productCode, Long exceptId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("date", date);
        params.put("productCode", productCode);
        params.put("exceptId", exceptId);
        return selectList("ProductionConfirmDAO.selectLotNos", params);
    }

    /** 넣은 뒤 row.id 에 새 ID 가 채워진다. */
    public void insertSchedule(ProductionScheduleVO row) throws Exception {
        insert("ProductionConfirmDAO.insertSchedule", row);
    }

    public void updateSchedule(ProductionScheduleVO row) throws Exception {
        update("ProductionConfirmDAO.updateSchedule", row);
    }

    public void updateLotNo(long id, String lotNo) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("lotNo", lotNo);
        update("ProductionConfirmDAO.updateLotNo", params);
    }

    public void deleteSchedule(long id) throws Exception {
        delete("ProductionConfirmDAO.deleteSchedule", id);
    }

    public void deleteSubstitutions(long scheduleId) throws Exception {
        delete("ProductionConfirmDAO.deleteSubstitutions", scheduleId);
    }

    public String selectProductCodeByDisplayName(String displayName) throws Exception {
        return selectOne("ProductionConfirmDAO.selectProductCodeByDisplayName", displayName);
    }

    /** 거래처마스터 이름 → 거래처코드(2026-10-26) */
    public String selectClientCodeByName(String clientName) throws Exception {
        return selectOne("ProductionConfirmDAO.selectClientCodeByName", clientName);
    }

    public List<MaterialLineVO> selectBom(String productCode) throws Exception {
        return selectList("ProductionConfirmDAO.selectBom", productCode);
    }

    public List<MaterialLineVO> selectSubstitutions(long scheduleId) throws Exception {
        return selectList("ProductionConfirmDAO.selectSubstitutions", scheduleId);
    }

    /** 원재료 재고에 더한다(깎을 때는 음수) */
    public void addMaterialStock(String code, double qty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("qty", qty);
        update("ProductionConfirmDAO.addMaterialStock", params);
    }

    public void insertMaterialUsage(MaterialLineVO usage) throws Exception {
        insert("ProductionConfirmDAO.insertMaterialUsage", usage);
    }

    public List<MaterialLineVO> selectMaterialUsage(long scheduleId) throws Exception {
        return selectList("ProductionConfirmDAO.selectMaterialUsage", scheduleId);
    }

    public void deleteMaterialUsage(long scheduleId) throws Exception {
        delete("ProductionConfirmDAO.deleteMaterialUsage", scheduleId);
    }

    public List<MaterialLineVO> selectBatchLines(String productCode) throws Exception {
        return selectList("ProductionConfirmDAO.selectBatchLines", productCode);
    }

    public List<ProductionOrderVO> selectImportOrders(String start, String end) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        return selectList("ProductionConfirmDAO.selectImportOrders", params);
    }

    /** 수주의 '생산으로 가져감' 표시(1/0) */
    public void updateOrderImportedProduction(long orderId, int value) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", orderId);
        params.put("value", value);
        update("ProductionConfirmDAO.updateOrderImportedProduction", params);
    }

    /** 같은 수주에서 나온, 아직 로트가 없는 출하등록 줄을 이 로트에 연결 */
    public void linkShipmentsToLot(long sourceOrderId, long lotId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("sourceOrderId", sourceOrderId);
        params.put("lotId", lotId);
        update("ProductionConfirmDAO.linkShipmentsToLot", params);
    }
}
