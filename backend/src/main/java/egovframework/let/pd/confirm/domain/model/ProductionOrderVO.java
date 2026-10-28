package egovframework.let.pd.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 생산확정 가져오기 창의 수주 한 줄 VO 클래스(생산예정일로 찾고 아직 생산으로 안 가져간 수주)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "가져올 수주")
@Getter
@Setter
public class ProductionOrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수주 ID")
    private Long id;

    @Schema(description = "수주일")
    private String orderDate;

    @Schema(description = "생산예정일")
    private String productionDate;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "품목명(규격)")
    private String productName;

    @Schema(description = "수량")
    private String orderQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "물류출고일")
    private String logisticsDate;

    @Schema(description = "재고생산(1/0)")
    private Integer isStockProduction;
}
