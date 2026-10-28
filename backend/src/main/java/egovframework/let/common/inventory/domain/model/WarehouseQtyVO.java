package egovframework.let.common.inventory.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 공통 재고 - 창고 하나에 있는 양 VO 클래스 (송연 warehouse_splitter 의 {name, qty})
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "창고별 재고")
@Getter
@Setter
public class WarehouseQtyVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private Double qty;

    public WarehouseQtyVO() {
    }

    public WarehouseQtyVO(String name, double qty) {
        this.name = name;
        this.qty = qty;
    }
}
