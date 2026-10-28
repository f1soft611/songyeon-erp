package egovframework.let.sales.product.pricing.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 단가관리 VO 클래스 (송연 pricing). 목록·단가상세·저장 값으로 같이 쓴다
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "단가표 한 줄")
@Getter
@Setter
public class PricingVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드")
    private String productCode;

    @Schema(description = "제품명")
    private String productName;

    @Schema(description = "규격/단위")
    private String spec;

    @Schema(description = "포장유형")
    private String productType;

    @Schema(description = "원재료비")
    private Double materialCost;

    @Schema(description = "고정마진율(%, 입력한 값 그대로)")
    private Double markupRate;

    @Schema(description = "고정마진 = 원재료비 × 율/100")
    private Double markupCost;

    @Schema(description = "로스율(%, 입력한 값 그대로)")
    private Double lossRate;

    @Schema(description = "로스 = (원재료비 + 고정마진) × 율/100")
    private Double lossCost;

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

    @Schema(description = "현재 판매단가(적혀 있으면 매출·거래명세표가 이 값을 씀)")
    private Double currentPrice;

    @Schema(description = "제품단가(최종계산단가) = 모든 원가 항목의 합")
    private Double totalPrice;

    @Schema(description = "거래처코드(clients.client_code, 2026-10-28 예전 거래처명)")
    private String clientCode;

    @Schema(description = "거래처명(거래처마스터에서 붙인다)")
    private String clientName;
}
