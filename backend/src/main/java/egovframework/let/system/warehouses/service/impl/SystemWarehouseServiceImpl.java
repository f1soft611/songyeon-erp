package egovframework.let.system.warehouses.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.system.warehouses.domain.model.SystemWarehouseSaveRequestVO;
import egovframework.let.system.warehouses.domain.model.SystemWarehouseSearchConditionVO;
import egovframework.let.system.warehouses.domain.model.SystemWarehouseVO;
import egovframework.let.system.warehouses.domain.repository.SystemWarehouseDAO;
import egovframework.let.system.warehouses.service.SystemWarehouseService;

/**
 * 창고 관리를 위한 서비스 구현 클래스
 * @author S-ERP
 * @since 2026.09.09
 * @version 1.0
 */
@Service("systemWarehouseService")
public class SystemWarehouseServiceImpl extends EgovAbstractServiceImpl implements SystemWarehouseService {

    private final SystemWarehouseDAO systemWarehouseDAO;

    public SystemWarehouseServiceImpl(SystemWarehouseDAO systemWarehouseDAO) {
        this.systemWarehouseDAO = systemWarehouseDAO;
    }

    @Override
    public List<SystemWarehouseVO> listWarehouses(Long tenantId) throws Exception {
        SystemWarehouseSearchConditionVO condition = new SystemWarehouseSearchConditionVO();
        condition.setTenantId(tenantId);
        return systemWarehouseDAO.selectWarehouseList(condition);
    }

    @Override
    @Transactional
    public SystemWarehouseVO createWarehouse(Long tenantId, Long currentUserId, SystemWarehouseSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getWarehouseNm())) {
            throw new IllegalArgumentException("창고명은 필수입니다.");
        }

        validateWarehouseNameDuplication(tenantId, payload.getWarehouseNm().trim(), null);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("warehouseNm", payload.getWarehouseNm().trim());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");
        params.put("createdBy", currentUserId);

        Long newId = systemWarehouseDAO.insertWarehouse(params);
        return findByIdOrThrow(tenantId, newId);
    }

    @Override
    @Transactional
    public SystemWarehouseVO updateWarehouse(Long tenantId, Long currentUserId, Long warehouseId, SystemWarehouseSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getWarehouseNm())) {
            throw new IllegalArgumentException("창고명은 필수입니다.");
        }

        findByIdOrThrow(tenantId, warehouseId);

        String warehouseNm = payload.getWarehouseNm().trim();
        validateWarehouseNameDuplication(tenantId, warehouseNm, warehouseId);

        Map<String, Object> params = new HashMap<>();
        params.put("warehouseId", warehouseId);
        params.put("tenantId", tenantId);
        params.put("warehouseNm", warehouseNm);
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");
        params.put("updatedBy", currentUserId);
        systemWarehouseDAO.updateWarehouse(params);

        return findByIdOrThrow(tenantId, warehouseId);
    }

    @Override
    @Transactional
    public void deleteWarehouse(Long tenantId, Long warehouseId) throws Exception {
        findByIdOrThrow(tenantId, warehouseId);

        Map<String, Object> params = new HashMap<>();
        params.put("warehouseId", warehouseId);
        params.put("tenantId", tenantId);

        systemWarehouseDAO.deleteWarehouse(params);
    }

    private SystemWarehouseVO findByIdOrThrow(Long tenantId, Long warehouseId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("warehouseId", warehouseId);
        params.put("tenantId", tenantId);
        SystemWarehouseVO warehouse = systemWarehouseDAO.selectWarehouseById(params);
        if (warehouse == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "창고를 찾을 수 없습니다.");
        }
        return warehouse;
    }

    private void validateWarehouseNameDuplication(Long tenantId, String warehouseNm, Long excludeId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("warehouseNm", warehouseNm);
        Long existingId = systemWarehouseDAO.selectWarehouseIdByName(params);
        if (existingId != null && (excludeId == null || !excludeId.equals(existingId))) {
            throw new IllegalArgumentException("이미 사용 중인 창고명입니다.");
        }
    }
}
