package egovframework.let.sales.shipment.shipmentregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 출하등록에서 보는 수주 한 줄 VO 클래스(로트 선택의 생산예정 수주, 수주등록 가져오기 목록)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "수주")
@Getter
@Setter
public class PendingOrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수주 ID")
    private Long id;

    @Schema(description = "수주일")
    private String orderDate;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "품목명")
    private String productName;

    @Schema(description = "수량")
    private String orderQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "생산예정일")
    private String productionDate;

    @Schema(description = "물류출고일")
    private String logisticsDate;
}
