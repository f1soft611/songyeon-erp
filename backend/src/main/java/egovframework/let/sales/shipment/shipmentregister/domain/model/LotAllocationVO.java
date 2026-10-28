package egovframework.let.sales.shipment.shipmentregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 출하등록 로트 배분 한 줄 VO 클래스 (송연 shipment_lot_allocation: 어느 로트에서 몇 kg)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "로트 배분")
@Getter
@Setter
public class LotAllocationVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "출하 ID")
    private Long shipmentId;

    @Schema(description = "로트 ID")
    private Long lotId;

    @Schema(description = "수량")
    private Double qty;

    @Schema(description = "로트번호")
    private String lotNo;

    @Schema(description = "로트 생산일")
    private String lotDate;
}
