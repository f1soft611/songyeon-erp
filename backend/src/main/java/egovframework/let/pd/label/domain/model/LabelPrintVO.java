package egovframework.let.pd.label.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 라벨출력 한 줄 VO 클래스 (송연 PD0004DTO). 제품코드가 없으면 제품BOM 에 없는 품목이라 라벨을 찍을 수 없다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "라벨출력 한 줄")
@Getter
@Setter
public class LabelPrintVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산확정 ID")
    private Long scheduleId;

    @Schema(description = "품목명")
    private String productName;

    @Schema(description = "생산수량(생산확정 때 적은 지시량, 단위가 붙은 글자)")
    private String orderQty;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "제품코드")
    private String productCode;

    @Schema(description = "규격단위")
    private String spec;
}
