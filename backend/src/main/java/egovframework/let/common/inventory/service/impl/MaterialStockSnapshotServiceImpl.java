package egovframework.let.common.inventory.service.impl;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.common.inventory.domain.model.StockDeltaVO;
import egovframework.let.common.inventory.domain.repository.MaterialStockSnapshotDAO;
import egovframework.let.common.inventory.service.MaterialStockSnapshotService;
import egovframework.let.common.inventory.service.WarehouseSplit;

/**
 * 공통 재고 - 원재료 '그 날짜 재고' 서비스 구현 클래스 (송연 app.py material_delta_after · moved_stock_map · warehouse_splitter 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("materialStockSnapshotService")
public class MaterialStockSnapshotServiceImpl extends EgovAbstractServiceImpl implements MaterialStockSnapshotService {

    private final MaterialStockSnapshotDAO materialStockSnapshotDAO;

    public MaterialStockSnapshotServiceImpl(MaterialStockSnapshotDAO materialStockSnapshotDAO) {
        this.materialStockSnapshotDAO = materialStockSnapshotDAO;
    }

    // 덮어쓰기(재고조정)도 (새 재고 - 옛 재고) 증감으로 보면 나머지와 똑같아져서, 넷을 순서 상관없이 더하면 된다
    @Override
    public Map<String, Double> deltaAfter(String date) throws Exception {
        Map<String, Double> delta = new HashMap<>();
        add(delta, materialStockSnapshotDAO.selectReceivingAfter(date), 1);
        add(delta, materialStockSnapshotDAO.selectUsageAfter(date), -1);
        add(delta, materialStockSnapshotDAO.selectMovementAfter(date), 1);
        add(delta, materialStockSnapshotDAO.selectAdjustmentAfter(date), 1);
        return delta;
    }

    @Override
    public WarehouseSplit warehouseSplit(String date) throws Exception {
        List<String> names = materialStockSnapshotDAO.selectWarehouseNames();
        String receiving = materialStockSnapshotDAO.selectReceivingWarehouseName();
        // 입고창고는 여기 담지 않는다 — 그쪽은 '총재고 - 옮겨간 것' 으로 구한다
        Map<String, Map<String, Double>> moved = new HashMap<>();
        for (StockDeltaVO row : materialStockSnapshotDAO.selectMovedStock(date)) {
            if (row.getWarehouse() == null || row.getWarehouse().isEmpty()) {
                continue;
            }
            moved.computeIfAbsent(row.getCode(), k -> new LinkedHashMap<>())
                    .put(row.getWarehouse(), row.getQty() == null ? 0 : row.getQty());
        }
        return new WarehouseSplit(names, receiving, moved);
    }

    @Override
    public Map<String, Double> movedOutOfReceiving() throws Exception {
        Map<String, Double> out = new HashMap<>();
        for (StockDeltaVO row : materialStockSnapshotDAO.selectMovedStock(null)) {
            if (row.getWarehouse() == null || row.getWarehouse().isEmpty() || row.getCode() == null) {
                continue;
            }
            out.merge(row.getCode(), row.getQty() == null ? 0 : row.getQty(), Double::sum);
        }
        return out;
    }

    private static void add(Map<String, Double> delta, List<StockDeltaVO> rows, int sign) {
        for (StockDeltaVO row : rows) {
            if (row.getCode() == null || row.getCode().isEmpty() || row.getQty() == null || row.getQty() == 0) {
                continue;
            }
            delta.merge(row.getCode(), sign * row.getQty(), Double::sum);
        }
    }
}
