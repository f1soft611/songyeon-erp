package egovframework.let.pu.stockstatus.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고현황 입고 로트 한 줄 VO 클래스 (송연 /api/materials/{code}/lots)
 * 입고 한 건이 곧 로트다(바코드 = 품목코드_입고일자_순번). 로트마다 남은 양은 아직 낼 수 없어 들어온 양과 반품만 준다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "원재료 입고 로트")
@Getter
@Setter
public class MaterialLotVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String barcode;
    private String receiveDate;
    private String clientName;
    private Double qty;
    private Double unitPrice;
    private String taxType;
    private Integer isReturn;
    private String returnReason;
    private Long returnOfId;
    @Schema(description = "기준일까지 이 입고에서 반품한 양")
    private Double returnedQty;
    @Schema(description = "실입고 = 입고량 - 반품")
    private Double netQty;
}
