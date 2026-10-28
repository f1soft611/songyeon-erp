package egovframework.let.co.master.warehouse.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;

/**
 * 기초정보 - 창고등록 데이터 접근 클래스 (tb_warehouse)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_warehouse 로 변경)
 */
@Repository("warehouseDAO")
public class WarehouseDAO extends EgovAbstractMapper {

    public List<WarehouseVO> selectWarehouseList(Map<String, Object> params) throws Exception {
        return selectList("WarehouseDAO.selectWarehouseList", params);
    }

    public WarehouseVO selectWarehouse(Map<String, Object> params) throws Exception {
        return selectOne("WarehouseDAO.selectWarehouse", params);
    }


    public long countActiveName(Map<String, Object> params) throws Exception {
        return count("WarehouseDAO.countActiveName", params);
    }

    public long countCode(String warehouseCd) throws Exception {
        return count("WarehouseDAO.countCode", warehouseCd);
    }

    /** 6자리 숫자 창고코드 가운데 가장 큰 번호(표 전체). 없으면 null */
    public Integer selectMaxAutoCodeNo() throws Exception {
        return selectOne("WarehouseDAO.selectMaxAutoCodeNo");
    }

    public Integer selectMaxSortSeq(Map<String, Object> params) throws Exception {
        return selectOne("WarehouseDAO.selectMaxSortSeq", params);
    }

    public void insertWarehouse(Map<String, Object> params) throws Exception {
        insert("WarehouseDAO.insertWarehouse", params);
    }

    public int updateWarehouse(Map<String, Object> params) throws Exception {
        return update("WarehouseDAO.updateWarehouse", params);
    }

    public int clearDefaultWarehouse(Map<String, Object> params) throws Exception {
        return update("WarehouseDAO.clearDefaultWarehouse", params);
    }

    public long countActiveDefault(Map<String, Object> params) throws Exception {
        return count("WarehouseDAO.countActiveDefault", params);
    }

    private long count(String statement, Object params) {
        Long n = selectOne(statement, params);
        return n == null ? 0L : n;
    }
}
