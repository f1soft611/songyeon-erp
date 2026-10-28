package egovframework.let.sa.shipment.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 출하등록 로트 선택의 로트 한 건 VO 클래스.
 * status = produced(생산입고 끝) | planned(생산확정만 됨). 잔량 = 생산량(없으면 계획수량) - 출하량
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "제품 로트")
@Getter
@Setter
public class ProductLotVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "로트 ID")
    private Long lotId;

    @Schema(description = "생산일")
    private String lotDate;

    @Schema(description = "로트번호")
    private String lotNo;

    @Schema(description = "produced | planned")
    private String status;

    @Schema(description = "생산량(생산입고 전이면 계획수량)")
    private Double producedQty;

    @Schema(description = "출하량")
    private Double shippedQty;

    @Schema(description = "잔량")
    private Double remainingQty;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "계획수량")
    private String orderQty;
}
