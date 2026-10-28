package egovframework.let.pd.actual.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 생산입고 한 줄 VO 클래스 (송연 production_schedule). 실생산량은 '980kg' 처럼 단위가 붙은 글자다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "생산입고 한 줄")
@Getter
@Setter
public class ProductionActualVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산확정 ID")
    private Long id;

    @Schema(description = "생산일자")
    private String scheduleDate;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "품목명(규격)")
    private String productName;

    @Schema(description = "제품코드")
    private String productCode;

    @Schema(description = "생산지시량(계획)")
    private String orderQty;

    @Schema(description = "실생산량(이 화면에서만 바꾼다)")
    private String actualQty;

    @Schema(description = "로트번호")
    private String lotNo;
}
