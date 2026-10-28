package egovframework.let.sales.shipment.shipmentregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 출하등록 로트 출하량 세기용 VO 클래스 (production_schedule·logistics_schedule 한 줄, 화면에 내보내지 않음)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "로트 계산용 줄")
@Getter
@Setter
public class LotRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "로트 ID")
    private Long lotId;

    @Schema(description = "생산일")
    private String scheduleDate;

    @Schema(description = "실생산량/실출하량")
    private String actualQty;

    @Schema(description = "계획/예정량")
    private String orderQty;

    @Schema(description = "물류 실출하량")
    private String logisticsActualQty;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "로트번호")
    private String lotNo;

    @Schema(description = "출하확정")
    private Integer shipConfirmed;

    @Schema(description = "로트 배분이 있는 줄인지")
    private Boolean allocated;

    @Schema(description = "배분 합계")
    private Double qty;
}
