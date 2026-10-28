package egovframework.let.pd.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 생산확정·수정 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "생산확정 저장")
@Getter
@Setter
public class ProductionSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산일자(확정할 때 필수)")
    private String scheduleDate;

    @Schema(description = "거래처(비우면 없음, 있으면 거래처BOM 이름)")
    private String clientName;

    @Schema(description = "품목명(규격)")
    private String productName;

    @Schema(description = "생산지시량")
    private String orderQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "물류출고일")
    private String logisticsDate;

    @Schema(description = "가져온 수주 ID(없으면 재고생산)")
    private Long sourceOrderId;

    @Schema(description = "가져온 수주의 재고생산 표시")
    private Integer isStockProduction;
}
