package egovframework.let.system.warehouses.service;

import java.util.List;

import egovframework.let.system.warehouses.domain.model.SystemWarehouseSaveRequestVO;
import egovframework.let.system.warehouses.domain.model.SystemWarehouseVO;

/**
 * 창고 관리를 위한 서비스 인터페이스 클래스
 * @author S-ERP
 * @since 2026.09.09
 * @version 1.0
 */
public interface SystemWarehouseService {

    /**
     * 테넌트 기준 창고 목록을 조회한다.
     *
     * @param tenantId
     * @exception Exception
     */
    List<SystemWarehouseVO> listWarehouses(Long tenantId) throws Exception;

    /**
     * 창고를 등록한다.
     *
     * @param tenantId
     * @param currentUserId 등록자(인증 사용자) ID
     * @param payload
     * @exception Exception
     */
    SystemWarehouseVO createWarehouse(Long tenantId, Long currentUserId, SystemWarehouseSaveRequestVO payload) throws Exception;

    /**
     * 창고를 수정한다.
     *
     * @param tenantId
     * @param currentUserId 수정자(인증 사용자) ID
     * @param warehouseId
     * @param payload
     * @exception Exception
     */
    SystemWarehouseVO updateWarehouse(Long tenantId, Long currentUserId, Long warehouseId, SystemWarehouseSaveRequestVO payload) throws Exception;

    /**
     * 창고를 삭제한다.
     *
     * @param tenantId
     * @param warehouseId
     * @exception Exception
     */
    void deleteWarehouse(Long tenantId, Long warehouseId) throws Exception;
}
