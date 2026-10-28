package egovframework.let.sales.order.quote.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 견적 원가 항목 VO 클래스(송연 compute_cost_fields 의 입력).
 * 견적 저장과, 견적 확정으로 제품을 등록할 때 단가관리에 넘기는 값(송연 quote_costs)에 같이 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "견적 원가 항목")
@Getter
@Setter
public class QuoteCostsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "고정마진율(%)")
    private Double markupRate;

    @Schema(description = "로스율(%)")
    private Double lossRate;

    @Schema(description = "인건비")
    private Double laborCost;

    @Schema(description = "포장비")
    private Double packagingCost;

    @Schema(description = "물류비")
    private Double logisticsCost;

    @Schema(description = "마진")
    private Double margin;

    @Schema(description = "기타단가1")
    private Double otherCost1;

    @Schema(description = "기타단가1 비고")
    private String otherCost1Note;

    @Schema(description = "기타단가2")
    private Double otherCost2;

    @Schema(description = "기타단가2 비고")
    private String otherCost2Note;

    @Schema(description = "기타단가3")
    private Double otherCost3;

    @Schema(description = "기타단가3 비고")
    private String otherCost3Note;

    @Schema(description = "기타단가4")
    private Double otherCost4;

    @Schema(description = "기타단가4 비고")
    private String otherCost4Note;

    @Schema(description = "확정단가(현재 판매단가)")
    private Double currentPrice;
}
