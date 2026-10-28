package egovframework.let.common.inventory.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 공통 재고 - 원재료·부자재 수불 한 줄 VO 클래스 (송연 material_stock_movement)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "원재료 수불 한 줄")
@Getter
@Setter
public class MaterialStockMovementVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료코드")
    private String materialCode;

    @Schema(description = "원재료명")
    private String materialName;

    @Schema(description = "들어온 양")
    private Double inQty;

    @Schema(description = "나간 양")
    private Double outQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "기록 시각")
    private String createdAt;
}
