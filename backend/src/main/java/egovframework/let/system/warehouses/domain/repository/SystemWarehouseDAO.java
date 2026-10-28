package egovframework.let.system.warehouses.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.warehouses.domain.model.SystemWarehouseSearchConditionVO;
import egovframework.let.system.warehouses.domain.model.SystemWarehouseVO;

/**
 * 창고 관리를 위한 데이터 접근 클래스
 * @author S-ERP
 * @since 2026.09.09
 * @version 1.0
 */
@Repository("systemWarehouseDAO")
public class SystemWarehouseDAO extends EgovAbstractMapper {

    /**
     * 창고 목록을 조회한다.
     */
    public List<SystemWarehouseVO> selectWarehouseList(SystemWarehouseSearchConditionVO condition) throws Exception {
        return selectList("SystemWarehouseDAO.selectWarehouseList", condition);
    }

    /**
     * 창고 단건을 조회한다.
     */
    public SystemWarehouseVO selectWarehouseById(Map<String, Object> params) throws Exception {
        return selectOne("SystemWarehouseDAO.selectWarehouseById", params);
    }

    /**
     * 같은 테넌트 내 창고명 존재 여부를 조회한다.
     */
    public Long selectWarehouseIdByName(Map<String, Object> params) throws Exception {
        return selectOne("SystemWarehouseDAO.selectWarehouseIdByName", params);
    }

    /**
     * 창고를 등록한다.
     */
    public Long insertWarehouse(Map<String, Object> payload) throws Exception {
        return selectOne("SystemWarehouseDAO.insertWarehouse", payload);
    }

    /**
     * 창고를 수정한다.
     */
    public void updateWarehouse(Map<String, Object> payload) throws Exception {
        update("SystemWarehouseDAO.updateWarehouse", payload);
    }

    /**
     * 창고를 삭제한다.
     */
    public void deleteWarehouse(Map<String, Object> params) throws Exception {
        delete("SystemWarehouseDAO.deleteWarehouse", params);
    }
}
