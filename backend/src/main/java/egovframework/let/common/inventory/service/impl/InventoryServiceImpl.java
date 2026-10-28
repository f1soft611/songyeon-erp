package egovframework.let.common.inventory.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.common.inventory.domain.model.InventoryItemVO;
import egovframework.let.common.inventory.domain.model.MaterialStockMovementVO;
import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.domain.repository.InventoryDAO;
import egovframework.let.common.inventory.service.InventoryService;

/**
 * 공통 재고 원장 서비스 구현 클래스
 * 송연 변환본(InventoryService.moveProductStock · moveMaterialStock · applyFilmPouchUsage)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("inventoryService")
public class InventoryServiceImpl extends EgovAbstractServiceImpl implements InventoryService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final InventoryDAO inventoryDAO;

    public InventoryServiceImpl(InventoryDAO inventoryDAO) {
        this.inventoryDAO = inventoryDAO;
    }

    @Override
    public Double moveProductStock(String productCode, double qty, String kind, ProductStockMovementVO options) throws Exception {
        if (productCode == null || productCode.trim().isEmpty() || qty == 0) {
            return null;
        }
        InventoryItemVO product = inventoryDAO.selectProduct(productCode);
        if (product == null) {
            return null;
        }
        ProductStockMovementVO o = options == null ? new ProductStockMovementVO() : options;
        double after = (product.getStockQty() == null ? 0 : product.getStockQty()) + qty;
        inventoryDAO.updateProductStock(productCode, after);

        ProductStockMovementVO movement = new ProductStockMovementVO();
        movement.setProductCode(productCode);
        // 이름을 안 주면 제품 표의 '이름(규격)' 을 적는다 — 나중에 제품명이 바뀌어도 그때 이름이 남는다
        movement.setProductName(o.getProductName() != null ? o.getProductName() : displayName(product));
        movement.setMovedOn(o.getMovedOn() != null ? o.getMovedOn() : LocalDate.now(SEOUL).toString());
        movement.setKind(kind);
        movement.setQty(qty);
        movement.setBalanceAfter(after);
        movement.setSourceTable(o.getSourceTable());
        movement.setSourceId(o.getSourceId());
        movement.setClientName(o.getClientName());
        movement.setNote(o.getNote());
        movement.setCreatedBy(o.getCreatedBy()); // 2026-10-26 사번
        movement.setCreatedAt(now());
        inventoryDAO.insertProductMovement(movement);
        return after;
    }

    @Override
    public void moveMaterialStock(String materialCode, double delta, String note) throws Exception {
        if (materialCode == null || materialCode.trim().isEmpty() || delta == 0) {
            return;
        }
        String name = inventoryDAO.selectMaterialName(materialCode);
        if (name == null) {
            return;
        }
        inventoryDAO.addMaterialStock(materialCode, delta);
        MaterialStockMovementVO movement = new MaterialStockMovementVO();
        movement.setMaterialCode(materialCode);
        movement.setMaterialName(name);
        movement.setInQty(delta > 0 ? delta : null);
        movement.setOutQty(delta < 0 ? -delta : null);
        movement.setNote(note);
        movement.setCreatedAt(now());
        inventoryDAO.insertMaterialMovement(movement);
    }

    @Override
    public void applyFilmPouchUsage(String productCode, double deltaKg, String note) throws Exception {
        if (productCode == null || productCode.trim().isEmpty() || deltaKg == 0) {
            return;
        }
        InventoryItemVO product = inventoryDAO.selectSubMaterials(productCode);
        if (product == null) {
            return;
        }
        Double netWeight = product.getPouchNetWeightKg();
        if (netWeight == null || netWeight <= 0) {
            return; // 아직 부자재를 안 쓰는 제품이 대부분이다
        }
        double bags = deltaKg / netWeight;
        if (product.getFilmMaterialCode() != null && product.getPouchLengthM() != null) {
            moveMaterialStock(product.getFilmMaterialCode(), -(bags * product.getPouchLengthM()), note + " (필름)");
        }
        if (product.getPouchMaterialCode() != null) {
            double per = product.getPouchPerUnit() == null ? 1 : product.getPouchPerUnit();
            moveMaterialStock(product.getPouchMaterialCode(), -(bags * per), note + " (파우치)");
        }
    }

    // 송연 applyBoxUsage: 출하확정 때 박스수량만큼 연결된 박스 재고를 뺀다(확정취소면 되돌린다)
    @Override
    public void applyBoxUsage(String productCode, double boxDelta, String note) throws Exception {
        if (productCode == null || productCode.trim().isEmpty() || boxDelta == 0) {
            return;
        }
        InventoryItemVO product = inventoryDAO.selectSubMaterials(productCode);
        if (product == null || product.getBoxMaterialCode() == null) {
            return;
        }
        moveMaterialStock(product.getBoxMaterialCode(), -boxDelta, note + " (박스)");
    }

    private static String displayName(InventoryItemVO product) {
        String name = product.getName() == null ? "" : product.getName();
        return product.getSpec() != null && !product.getSpec().isEmpty() ? name + "(" + product.getSpec() + ")" : name;
    }

    private static String now() {
        return LocalDateTime.now(SEOUL).format(CREATED_AT);
    }
}
