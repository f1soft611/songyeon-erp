package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 창고이동 한 줄(material_warehouse_move) VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class WarehouseMoveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String materialCode;
    private String materialName;
    private String barcode;
    private String fromWarehouse;
    private String toWarehouse;
    private Integer packCount;
    private Double unitWeight;
    private Double qty;
    private String movedDate;
    private String movedBy;
    private String createdAt;
    private String receiveDate;
}
